const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');

const app = express();
app.use(express.static('public'));

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const users = new Map(); // id -> { ws, name }
let nextId = 1;

function broadcastUsers() {
  const list = [...users.entries()].map(([id, u]) => ({ id, name: u.name }));
  const msg = JSON.stringify({ type: 'users', users: list });
  for (const u of users.values()) u.ws.send(msg);
}

wss.on('connection', (ws) => {
  const id = String(nextId++);

  ws.on('message', (raw) => {
    const msg = JSON.parse(raw);

    if (msg.type === 'join') {
      users.set(id, { ws, name: msg.name });
      ws.send(JSON.stringify({ type: 'welcome', id }));
      broadcastUsers();
    } else if (['offer', 'answer', 'candidate'].includes(msg.type)) {
      const target = users.get(msg.to);
      if (target) target.ws.send(JSON.stringify({ ...msg, from: id }));
    }
  });

  ws.on('close', () => {
    users.delete(id);
    broadcastUsers();
  });
});

const PORT = process.env.PORT || 10509;
server.listen(PORT, () => console.log('Servidor en puerto', PORT));
