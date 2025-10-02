import 'dotenv/config';
import http from 'http';
import { Server } from 'socket.io';
import { createApp } from './app.js';
import db from './database.js';
import type { Investment } from './types.js';

const PORT = Number(process.env.PORT) || 4000;

const app = createApp();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', credentials: false }
});

const broadcastInvestments = () => {
  const investments = db.prepare('SELECT * FROM investments').all() as Investment[];
  const payload = investments.map((inv) => ({
    symbol: inv.symbol,
    name: inv.name,
    type: inv.type,
    quantity: inv.quantity,
    avg_price: inv.avg_price,
    current_price: inv.current_price,
    total_value: inv.quantity * inv.current_price,
    performance: inv.avg_price > 0 ? (inv.current_price - inv.avg_price) / inv.avg_price : 0,
  }));
  io.emit('investment:stream', { data: payload, timestamp: new Date().toISOString() });
};

io.on('connection', (socket) => {
  socket.emit('investment:ready', { message: 'Conectado a stream de investimentos.' });
  const investments = db.prepare('SELECT * FROM investments').all() as Investment[];
  socket.emit('investment:stream', {
    data: investments.map((inv) => ({
      symbol: inv.symbol,
      name: inv.name,
      type: inv.type,
      quantity: inv.quantity,
      avg_price: inv.avg_price,
      current_price: inv.current_price,
      total_value: inv.quantity * inv.current_price,
      performance: inv.avg_price > 0 ? (inv.current_price - inv.avg_price) / inv.avg_price : 0,
    })),
    timestamp: new Date().toISOString(),
  });
});

setInterval(() => {
  const investments = db.prepare('SELECT * FROM investments').all() as Investment[];
  const updateStatement = db.prepare('UPDATE investments SET current_price = ? WHERE id = ?');

  investments.forEach((investment) => {
    const variation = 1 + (Math.random() - 0.5) * 0.02; // +/- 1%
    const newPrice = Math.max(investment.current_price * variation, 0.01);
    updateStatement.run(newPrice, investment.id);
  });

  broadcastInvestments();
}, 5000);

server.listen(PORT, () => {
  console.log(`Servidor iniciado na porta ${PORT}`);
});
