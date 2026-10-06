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
const wss = new WebSocketServer({ server, path: '/ws' });

app.use(express.json({ limit: '15mb' }));

// Permissive CORS for iframe, cross-device access, and proxy setups
app.use((_req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  if (_req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
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

// Broadcast payload to all open clients
function broadcast(payload: Record<string, unknown>, excludeWs?: WebSocket) {
  const message = JSON.stringify(payload);
  for (const client of wss.clients) {
    if (client !== excludeWs && client.readyState === WebSocket.OPEN) {
      client.send(message);
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
    ws.ping();
  }
}, 20000);

wss.on('close', () => {
  clearInterval(heartbeatInterval);
});

// WebSocket connection lifecycle
wss.on('connection', (socket: WebSocket) => {
  const ws = socket as ExtendedWebSocket;
  ws.isAlive = true;

  ws.on('pong', () => {
    ws.isAlive = true;
  });

  // Send current state and presence count immediately on connect
  ws.send(
    JSON.stringify({
      type: 'init',
      state: sharedState,
      connectedDevices: wss.clients.size,
    })
  );

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
          })
        );
      } else if (data.type === 'get_state') {
        ws.send(
          JSON.stringify({
            type: 'init',
            state: sharedState,
            connectedDevices: wss.clients.size,
          })
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

// REST API fallback for clients behind strict firewalls/proxies or mobile polling
app.get('/api/state', (_req, res) => {
  res.json({
    success: true,
    state: sharedState,
    connectedDevices: Math.max(1, wss.clients.size),
  });
});

app.post('/api/state', (req, res) => {
  const { rooms, settings } = req.body || {};
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

  res.json({
    success: true,
    state: sharedState,
    connectedDevices: Math.max(1, wss.clients.size),
  });
});

const isProd = process.env.NODE_ENV === 'production';
const port = parseInt(process.env.PORT || '3000', 10);

async function startServer() {
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
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
