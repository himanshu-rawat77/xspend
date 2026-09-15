/**
 * Solana Pay Service
 * Generates Solana Pay payment request URLs and QR payloads.
 *
 * Spec: https://docs.solanapay.com/spec
 */

import { PublicKey } from '@solana/web3.js';

const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface SolanaPayRequest {
  recipient: string;
  amount: number;        // in USDC
  splToken?: string;     // USDC mint by default
  reference?: string;    // random public key for payment confirmation
  label?: string;
  message?: string;
  memo?: string;
}

export interface SolanaPayResult {
  url: string;           // solana: URI
  qrData: string;        // same as url — pass to QR library
  reference: string;     // PublicKey string for polling confirmation
}

// ─── URL Builder ──────────────────────────────────────────────────────────────
/**
 * Build a Solana Pay transfer request URL.
 * Format: solana:<recipient>?amount=<amount>&spl-token=<mint>&reference=<ref>&label=...&message=...
 */
export function buildSolanaPayUrl(req: SolanaPayRequest): SolanaPayResult {
  const {
    recipient,
    amount,
    splToken = USDC_MINT,
    label = 'StockSpend Payment',
    message,
    memo,
  } = req;

  // Generate a random reference public key if not provided
  const reference = req.reference ?? generateReferenceKey();

  // Validate recipient
  try {
    new PublicKey(recipient);
  } catch {
    throw new Error(`Invalid recipient address: ${recipient}`);
  }

  const params = new URLSearchParams();
  params.set('amount', amount.toFixed(6));
  if (splToken) params.set('spl-token', splToken);
  params.set('reference', reference);
  if (label) params.set('label', label);
  if (message) params.set('message', message);
  if (memo) params.set('memo', memo);

  const url = `solana:${recipient}?${params.toString()}`;

  return { url, qrData: url, reference };
}

// ─── Reference key generator ──────────────────────────────────────────────────
/**
 * Generates a random-looking base58 public-key-like string.
 * In a real app, use Keypair.generate().publicKey.toBase58()
 */
export function generateReferenceKey(): string {
  const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  let result = '';
  for (let i = 0; i < 44; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

// ─── Payment confirmation polling ─────────────────────────────────────────────
/**
 * Polls Solana for a transaction that references the given reference public key.
 * Returns the transaction signature when found, or null on timeout.
 */
export async function pollPaymentConfirmation(
  connection: any, // Connection from @solana/web3.js
  reference: string,
  timeoutMs = 60_000,
  intervalMs = 3_000
): Promise<string | null> {
  const start = Date.now();
  const refKey = new PublicKey(reference);

  while (Date.now() - start < timeoutMs) {
    try {
      const signatures = await connection.getSignaturesForAddress(refKey, { limit: 1 });
      if (signatures.length > 0) {
        const sig = signatures[0];
        if (!sig.err) {
          return sig.signature;
        }
      }
    } catch (err) {
      console.warn('[solanaPay] Poll error:', err);
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }

  return null;
}

// ─── Mock payment (Demo Mode) ─────────────────────────────────────────────────
export function mockSolanaPayConfirmation(delayMs = 3000): Promise<string> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
      let sig = '';
      for (let i = 0; i < 88; i++) sig += chars[Math.floor(Math.random() * chars.length)];
      resolve(sig);
    }, delayMs);
  });
}

// ─── Merchant payment request builder ─────────────────────────────────────────
export function buildMerchantPayRequest(
  merchantWalletAddress: string,
  amountUSD: number,
  merchantName: string,
  orderId?: string
): SolanaPayResult {
  return buildSolanaPayUrl({
    recipient: merchantWalletAddress,
    amount: amountUSD,
    splToken: USDC_MINT,
    label: `Pay ${merchantName}`,
    message: `StockSpend — Pay \$${amountUSD.toFixed(2)} to ${merchantName}`,
    memo: orderId ?? `SS-${Date.now()}`,
  });
}
