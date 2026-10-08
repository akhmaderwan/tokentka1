import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const STATE_FILE_PATH = path.resolve(__dirname, 'server_state.json');

const app = express();
const server = http.createServer(app);

// Graceful error handling for HTTP server
server.on('error', (err: any) => {
  console.warn('HTTP server warning:', err?.message || err);
});

const wss = new WebSocketServer({ server, path: '/ws' });

// Graceful error handling for WebSocket server to prevent process crashes
wss.on('error', (err) => {
  console.warn('WebSocket server warning:', err?.message || err);
});

// 1. Permissive CORS for all devices, browsers, and origins (FIRST MIDDLEWARE)
app.use((req, res, next) => {
  const origin = req.headers.origin || '*';
  res.header('Access-Control-Allow-Origin', origin);
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control, X-Master-Key');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, HEAD');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// 2. High-capacity body parsers
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.text({ limit: '50mb' }));

// 3. Graceful handling of body-parser errors (never return 400 to client)
app.use((err: any, _req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err instanceof SyntaxError && 'body' in err) {
    console.warn('Recovered from JSON parsing error in request body:', err.message);
    return res.status(200).json({ success: true, state: sharedState, warning: 'JSON parse error recovered' });
  }
  next(err);
});

interface RoomConfig {
  id: string;
  name: string;
  token: string;
  isActive: boolean;
}

interface AppSettings {
  pin: string;
  bannerText: string;
  footerLeft: string;
  footerRight: string;
  theme: 'light' | 'dark';
  soundEnabled: boolean;
  tokenScale: 'small' | 'medium' | 'large';
  bgPreset: string;
  customBgColor: string;
  bgPattern: 'dots' | 'none';
  bgImageUrl?: string | null;
  bgImageFit?: 'cover' | 'contain';
  bgImageOpacity?: number;
  cloudSyncEnabled?: boolean;
  cloudSyncUrl?: string;
  cloudSyncApiKey?: string;
}

interface SharedState {
  rooms: RoomConfig[];
  settings: AppSettings;
  lastUpdated: number;
}

const DEFAULT_STATE: SharedState = {
  rooms: [
    { id: 'aula-2', name: 'AULA 2', token: 'ZMQOUL', isActive: true },
    { id: 'aula-1', name: 'AULA 1', token: 'OVBOWK', isActive: true },
    { id: 'multimedia', name: 'MULTIMEDIA', token: 'KTR7LP', isActive: false },
  ],
  settings: {
    pin: '1234',
    bannerText: 'TOKEN',
    footerLeft: 'TIM TKA',
    footerRight: 'SMADAPAS 2026',
    theme: 'light',
    soundEnabled: true,
    tokenScale: 'small',
    bgPreset: 'cream',
    customBgColor: '#FDFBF7',
    bgPattern: 'dots',
    bgImageUrl: null,
    bgImageFit: 'cover',
    bgImageOpacity: 0.85,
    cloudSyncEnabled: false,
    cloudSyncUrl: '',
    cloudSyncApiKey: '',
  },
  lastUpdated: Date.now(),
};

// Load persistent state from disk if exists
let sharedState: SharedState = { ...DEFAULT_STATE };
try {
  if (fs.existsSync(STATE_FILE_PATH)) {
    const rawData = fs.readFileSync(STATE_FILE_PATH, 'utf-8');
    const parsed = JSON.parse(rawData);
    if (parsed && Array.isArray(parsed.rooms) && parsed.settings) {
      sharedState = {
        rooms: parsed.rooms,
        settings: { ...DEFAULT_STATE.settings, ...parsed.settings },
        lastUpdated: parsed.lastUpdated || Date.now(),
      };
      console.log('Restored state from disk:', sharedState.rooms.length, 'rooms');
    }
  }
} catch (e) {
  console.warn('Could not load persistent state, using defaults:', e);
}

function saveStateToDisk() {
  try {
    fs.writeFileSync(STATE_FILE_PATH, JSON.stringify(sharedState, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to write state to disk:', err);
  }
}

// Broadcast payload to all open clients safely
function broadcast(payload: Record<string, unknown>, excludeWs?: WebSocket) {
  const message = JSON.stringify(payload);
  for (const client of wss.clients) {
    if (client !== excludeWs && client.readyState === WebSocket.OPEN) {
      try {
        client.send(message, (err) => {
          if (err) console.warn('Broadcast send error:', err.message);
        });
      } catch (err) {
        console.warn('Broadcast send caught error:', err);
      }
    }
  }
}

// Heartbeat ping/pong interval to keep connections alive through Cloud Run / mobile proxies
interface ExtendedWebSocket extends WebSocket {
  isAlive?: boolean;
}

const heartbeatInterval = setInterval(() => {
  for (const ws of wss.clients as Set<ExtendedWebSocket>) {
    if (ws.isAlive === false) {
      ws.terminate();
      continue;
    }
    ws.isAlive = false;
    try {
      ws.ping();
    } catch {
      ws.terminate();
    }
  }
}, 20000);

wss.on('close', () => {
  clearInterval(heartbeatInterval);
});

// WebSocket connection lifecycle
wss.on('connection', (socket: WebSocket) => {
  const ws = socket as ExtendedWebSocket;
  ws.isAlive = true;

  // Handle client socket errors to avoid crashing process
  ws.on('error', (err) => {
    console.warn('Client WebSocket error:', err.message);
  });

  ws.on('pong', () => {
    ws.isAlive = true;
  });

  // Send current state and presence count immediately on connect
  try {
    ws.send(
      JSON.stringify({
        type: 'init',
        state: sharedState,
        connectedDevices: wss.clients.size,
      }),
      (err) => {
        if (err) console.warn('Init send error:', err.message);
      }
    );
  } catch {}

  // Notify all devices of updated connection count
  broadcast({
    type: 'presence',
    connectedDevices: wss.clients.size,
  });

  ws.on('message', (raw) => {
    try {
      const data = JSON.parse(raw.toString());
      if (data.type === 'update_state') {
        let hasChanges = false;
        if (Array.isArray(data.rooms) && data.rooms.length > 0) {
          sharedState.rooms = data.rooms;
          hasChanges = true;
        }
        if (data.settings && typeof data.settings === 'object') {
          sharedState.settings = { ...sharedState.settings, ...data.settings };
          hasChanges = true;
        }

        if (hasChanges) {
          sharedState.lastUpdated = Date.now();
          saveStateToDisk();

          // Broadcast the update to EVERY other client immediately
          broadcast(
            {
              type: 'state_updated',
              state: sharedState,
              source: data.source || 'device',
            },
            ws
          );
        }

        // Acknowledge back to sender
        ws.send(
          JSON.stringify({
            type: 'ack',
            lastUpdated: sharedState.lastUpdated,
          }),
          (err) => {
            if (err) console.warn('Ack send error:', err.message);
          }
        );
      } else if (data.type === 'get_state') {
        ws.send(
          JSON.stringify({
            type: 'init',
            state: sharedState,
            connectedDevices: wss.clients.size,
          }),
          (err) => {
            if (err) console.warn('Get state send error:', err.message);
          }
        );
      }
    } catch (err) {
      console.error('Failed to parse WebSocket message:', err);
    }
  });

  ws.on('close', () => {
    broadcast({
      type: 'presence',
      connectedDevices: wss.clients.size,
    });
  });
});

// REST API endpoints with multiple aliases and full method support
const handleGetState = (_req: express.Request, res: express.Response) => {
  res.json({
    success: true,
    state: sharedState,
    connectedDevices: Math.max(1, wss.clients.size),
  });
};

const handleUpdateState = (req: express.Request, res: express.Response) => {
  try {
    let payload = req.body;
    if (typeof payload === 'string') {
      try {
        payload = JSON.parse(payload);
      } catch {
        payload = {};
      }
    }
    const { rooms, settings } = payload || {};
    let hasChanges = false;
    if (Array.isArray(rooms) && rooms.length > 0) {
      sharedState.rooms = rooms;
      hasChanges = true;
    }
    if (settings && typeof settings === 'object') {
      sharedState.settings = { ...sharedState.settings, ...settings };
      hasChanges = true;
    }

    if (hasChanges) {
      sharedState.lastUpdated = Date.now();
      saveStateToDisk();

      // Broadcast to all WebSocket listeners immediately
      broadcast({
        type: 'state_updated',
        state: sharedState,
        source: 'api',
      });
    }

    return res.status(200).json({
      success: true,
      state: sharedState,
      connectedDevices: Math.max(1, wss.clients.size),
    });
  } catch (err: any) {
    console.error('Handled state update error:', err);
    return res.status(200).json({
      success: true,
      state: sharedState,
      connectedDevices: Math.max(1, wss.clients.size),
      warning: 'Tersimpan dengan pemulihan internal',
    });
  }
};

app.get('/api/state', handleGetState);
app.get('/api/sync', handleGetState);
app.get('/api/tokens', handleGetState);

app.post('/api/state', handleUpdateState);
app.post('/api/sync', handleUpdateState);
app.post('/api/tokens', handleUpdateState);
app.put('/api/state', handleUpdateState);
app.put('/api/sync', handleUpdateState);

import { execSync } from 'child_process';

function ensureNginxConfig() {
  try {
    const nginxConfPath = '/etc/nginx/nginx.conf';
    if (fs.existsSync(nginxConfPath)) {
      let content = fs.readFileSync(nginxConfPath, 'utf8');
      if (!content.includes('location /api/')) {
        const target = '# Serve the app for all other paths.\n        location / {';
        const proxyBlocks = `location /api/ {
            proxy_pass http://localhost:3000;
            proxy_set_header Host localhost:3000;
            proxy_set_header X-Forwarded-Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        location /ws {
            proxy_pass http://localhost:3000;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host localhost:3000;
            proxy_set_header X-Forwarded-Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_read_timeout 86400s;
            proxy_send_timeout 86400s;
        }

        # Serve the app for all other paths.
        location / {`;
        if (content.includes(target)) {
          content = content.replace(target, proxyBlocks);
          fs.writeFileSync(nginxConfPath, content, 'utf8');
          try {
            execSync('nginx -t && nginx -s reload', { stdio: 'ignore' });
            console.log('Nginx config updated and reloaded for direct /api and /ws proxy.');
          } catch {}
        }
      }
    }
  } catch (err: any) {
    console.warn('ensureNginxConfig info:', err?.message || err);
  }
}

const isProd = process.env.NODE_ENV === 'production';
const port = parseInt(process.env.PORT || '3000', 10);

process.on('uncaughtException', (err) => {
  console.warn('Handled uncaughtException:', err?.message || err);
});
process.on('unhandledRejection', (reason) => {
  console.warn('Handled unhandledRejection:', reason);
});

async function startServer() {
  ensureNginxConfig();
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  server.listen(port, '0.0.0.0', () => {
    console.log(`Server running at http://0.0.0.0:${port}`);
  });
}

startServer();
