import { io, Socket } from 'socket.io-client';

const SOCKET_URL = (import.meta.env.VITE_SOCKET_URL ?? 'http://localhost:4000').replace(/\/$/, '');
let socket: Socket | null = null;

export const getInvestmentSocket = () => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      transports: ['websocket'],
      autoConnect: true,
    });
  }
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
