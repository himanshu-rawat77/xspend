import { Buffer } from 'buffer';

if (typeof global !== 'undefined') {
  (global as any).Buffer = (global as any).Buffer || Buffer;
}
if (typeof globalThis !== 'undefined') {
  (globalThis as any).Buffer = (globalThis as any).Buffer || Buffer;
}
if (typeof window !== 'undefined') {
  (window as any).Buffer = (window as any).Buffer || Buffer;
}

// Ensure global.crypto.getRandomValues is guaranteed for Solana Web3.js in Hermes
if (typeof (global as any).crypto !== 'object') {
  (global as any).crypto = {};
}
if (typeof (global as any).crypto.getRandomValues !== 'function') {
  (global as any).crypto.getRandomValues = function getRandomValues<T extends ArrayBufferView | null>(array: T): T {
    if (array) {
      const uint8 = new Uint8Array(array.buffer, array.byteOffset, array.byteLength);
      for (let i = 0; i < uint8.length; i++) {
        uint8[i] = Math.floor(Math.random() * 256);
      }
    }
    return array;
  };
}

export { Buffer };
