export const WebSocket = typeof window !== 'undefined' ? window.WebSocket : (globalThis as any).WebSocket;
export default WebSocket;
