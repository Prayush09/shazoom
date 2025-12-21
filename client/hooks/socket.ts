// socket.ts
import io from 'socket.io-client'; // Note: v2 export style is different

let socket: SocketIOClient.Socket | null = null;

export function getSocket(url: string): SocketIOClient.Socket {
  if (socket) return socket;

  socket = io(url, {
    transports: ['polling', 'websocket'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: Infinity,
    timeout: 20000,
    autoConnect: true
  });

  return socket;
}