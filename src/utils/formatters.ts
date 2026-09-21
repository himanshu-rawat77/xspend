import { SpendTransaction, TxConfirmationStatus } from '../types';

export const formatCurrency = (value: number, decimals: number = 2): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
};

export const formatNumber = (value: number, decimals: number = 2): string => {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
};

export const formatPercent = (value: number): string => {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(2)}%`;
};

export const shortenAddress = (address: string, chars: number = 4): string => {
  if (!address) return '';
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
};

export const getTxConfirmationStatus = (tx: SpendTransaction): TxConfirmationStatus => {
  if (tx.solanaTxSignature?.startsWith('demo_')) return 'confirmed';
  return tx.confirmationStatus ?? 'confirmed';
};

export const formatTxNetworkStatus = (tx: SpendTransaction): string => {
  if (tx.solanaTxSignature?.startsWith('demo_')) return 'Simulated (Demo Mode)';
  switch (getTxConfirmationStatus(tx)) {
    case 'submitted':
    case 'confirming':
      return 'Submitted — verifying on-chain';
    case 'failed':
      return 'Failed on-chain';
    case 'unknown':
      return 'Unknown — check explorer';
    default:
      return 'Confirmed (Solana)';
  }
};

export const generateSolanaSignature = (): string => {
  const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  let sig = '';
  for (let i = 0; i < 88; i++) {
    sig += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return sig;
};

// Generate smooth SVG Cubic Bézier path from coordinate points
export const generateSmoothPath = (
  points: { x: number; y: number }[]
): string => {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  let path = `M ${points[0].x} ${points[0].y}`;

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i === 0 ? 0 : i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] || p2;

    const cp1x = p1.x + (p2.x - p0.x) / 5;
    const cp1y = p1.y + (p2.y - p0.y) / 5;

    const cp2x = p2.x - (p3.x - p1.x) / 5;
    const cp2y = p2.y - (p3.y - p1.y) / 5;

    path += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }

  return path;
};
