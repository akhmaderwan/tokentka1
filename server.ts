import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

app.use(express.json({ limit: '10mb' }));

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
}

interface SharedState {
  rooms: RoomConfig[];
  settings: AppSettings;
  lastUpdated: number;
}

// Server-authoritative central state
let sharedState: SharedState = {
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
  },
  lastUpdated: Date.now(),
};

// Broadcast payload to all open clients
function broadcast(payload: Record<string, unknown>, excludeWs?: WebSocket) {
  const message = JSON.stringify(payload);
  for (const client of wss.clients) {
    if (client !== excludeWs && client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  }
}

// WebSocket connection lifecycle
wss.on('connection', (ws) => {
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
        if (Array.isArray(data.rooms)) {
          sharedState.rooms = data.rooms;
        }
        if (data.settings && typeof data.settings === 'object') {
          sharedState.settings = { ...sharedState.settings, ...data.settings };
        }
        sharedState.lastUpdated = Date.now();

        // Broadcast the update to EVERY other client
        broadcast(
          {
            type: 'state_updated',
            state: sharedState,
            source: data.source || 'device',
          },
          ws
        );

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

// REST API fallback for clients behind strict firewalls/proxies
app.get('/api/state', (_req, res) => {
  res.json({
    state: sharedState,
    connectedDevices: wss.clients.size,
  });
});

app.post('/api/state', (req, res) => {
  const { rooms, settings } = req.body || {};
  if (Array.isArray(rooms)) {
    sharedState.rooms = rooms;
  }
  if (settings && typeof settings === 'object') {
    sharedState.settings = { ...sharedState.settings, ...settings };
  }
  sharedState.lastUpdated = Date.now();

  // Broadcast to all WebSocket listeners
  broadcast({
    type: 'state_updated',
    state: sharedState,
    source: 'api',
  });

  res.json({
    success: true,
    state: sharedState,
    connectedDevices: wss.clients.size,
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
