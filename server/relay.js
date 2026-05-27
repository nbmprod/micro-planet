const WebSocket = require('ws');
const { v4: uuidv4 } = require('uuid');

const port = process.env.PORT || 3000;
const wss = new WebSocket.Server({ port });
console.log(`Relay server listening on ws://localhost:${port}`);

// Map of clientId -> { ws, playerId, color }
const clients = new Map();

function broadcast(msg, exceptWs = null) {
  const s = JSON.stringify(msg);
  for (const { ws } of clients.values()) {
    if (ws === exceptWs) continue;
    if (ws.readyState === WebSocket.OPEN) ws.send(s);
  }
}

wss.on('connection', (ws) => {
  const cid = uuidv4();
  clients.set(cid, { ws, playerId: null, color: null });
  console.log('Client connected', cid);

  ws.on('message', (data) => {
    let msg;
    try {
      msg = JSON.parse(data.toString());
    } catch (e) {
      console.warn('Invalid JSON', e);
      return;
    }

    if (msg.type === 'JOIN') {
      const playerId = uuidv4();
      const color = typeof msg.desiredColor === 'number' ? msg.desiredColor : Math.floor(Math.random() * 0xffffff);
      clients.set(cid, { ws, playerId, color });

      // Build list of other players
      const otherPlayers = [];
      for (const [otherCid, info] of clients.entries()) {
        if (otherCid === cid) continue;
        if (info.playerId) {
          otherPlayers.push({ playerId: info.playerId, color: info.color });
        }
      }

      // Reply to joining client with assigned id and list of other players
      ws.send(JSON.stringify({ type: 'JOINED', playerId, color, otherPlayers }));

      // Notify others about the new player
      broadcast({ type: 'PLAYER_JOINED', playerId, color }, ws);
      return;
    }

    if (msg.type === 'MOVE') {
      // Attach server timestamp and broadcast
      const info = clients.get(cid);
      if (!info || !info.playerId) return;
      const out = Object.assign({}, msg, { type: 'PLAYER_MOVED', playerId: info.playerId, color: info.color, serverTimestamp: Date.now() });
      broadcast(out, ws);
      return;
    }

    // Unknown message types are ignored
  });

  ws.on('close', () => {
    const info = clients.get(cid);
    if (info && info.playerId) {
      broadcast({ type: 'PLAYER_LEFT', playerId: info.playerId });
    }
    clients.delete(cid);
    console.log('Client disconnected', cid);
  });
});
