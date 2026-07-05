import { io, Socket } from 'socket.io-client';
import { generateFingerprint } from './useFingerprint';

const SIGNALING_URL =
  process.env.NEXT_PUBLIC_SIGNALING_URL || 'http://localhost:4000';

let socket: Socket | null = null;
let socketPromise: Promise<Socket> | null = null;

/**
 * Returns the socket.io singleton. On first call, generates a device
 * fingerprint and passes it in the socket auth handshake so the server
 * can key bans by hashed IP+fingerprint instead of raw socket IDs.
 */
export function getSocket(): Socket {
  if (typeof window === 'undefined') {
    return {
      on: () => {},
      off: () => {},
      emit: () => {},
      connect: () => {},
      disconnect: () => {},
    } as unknown as Socket;
  }

  if (!socket) {
    socket = io(SIGNALING_URL, {
      transports: ['websocket', 'polling'],
      autoConnect: false, // connect after fingerprint is set
    });

    // Generate fingerprint and attach before connecting
    generateFingerprint().then((fp) => {
      if (socket) {
        socket.auth = { fingerprint: fp };
        socket.connect();
      }
    });
  }
  return socket;
}
