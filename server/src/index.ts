import 'dotenv/config';
import http from 'http';
import { Server } from 'socket.io';
import { createApp } from './app.js';
import db from './database.js';
import { config } from './config.js';
import { logger } from './logger.js';
import { fetchFastApiAssets } from './services/fastapi.js';
import type { FastApiAsset } from './services/fastapi.js';
import type { Investment } from './types.js';

const PORT = config.PORT;

const app = createApp();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', credentials: false },
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

const syncInvestmentsWithFastApi = async () => {
  try {
    const assets = await fetchFastApiAssets();
    if (!assets.length) {
      return;
    }

    const symbolMap = new Map<string, FastApiAsset>();
    assets.forEach((asset) => {
      const base = asset.symbol.toUpperCase();
      symbolMap.set(base, asset);
      if (base.includes('.')) {
        symbolMap.set(base.split('.')[0] ?? base, asset);
      }
      if (base.includes('-')) {
        symbolMap.set(base.split('-')[0] ?? base, asset);
      }
    });

    const investments = db.prepare('SELECT * FROM investments').all() as Investment[];
    const updateStatement = db.prepare(
      'UPDATE investments SET current_price = ? WHERE id = ?',
    );

    const updateMany = db.transaction((rows: Investment[]) => {
      rows.forEach((investment) => {
        const asset = symbolMap.get(investment.symbol.toUpperCase());
        const lastPrice = asset?.metrics?.last_price;
        if (typeof lastPrice === 'number' && Number.isFinite(lastPrice)) {
          updateStatement.run(lastPrice, investment.id);
        }
      });
    });

    updateMany(investments);
  } catch (error) {
    logger.warn({ err: error }, 'Failed to sync prices with FastAPI');
  }
};

io.on('connection', (socket) => {
  socket.emit('investment:ready', { message: 'Connected to the investment stream.' });
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

const startPriceStreaming = () => {
  const run = async () => {
    await syncInvestmentsWithFastApi();
    broadcastInvestments();
  };
  void run();
  setInterval(() => void run(), 15_000);
};

startPriceStreaming();

server.listen(PORT, () => {
  logger.info({ port: PORT }, 'Servidor iniciado');
});
