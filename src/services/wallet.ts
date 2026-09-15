/**
 * Wallet Service
 * Handles Solana wallet connection via Phantom / Solflare deep-links
 * and Solana RPC querying.
 */

import { Linking, Platform } from 'react-native';
import { Connection, PublicKey, clusterApiUrl, LAMPORTS_PER_SOL } from '@solana/web3.js';

// ─── Solana Cluster Config ───────────────────────────────────────────────────
export type Cluster = 'mainnet-beta' | 'devnet';

export function getConnection(cluster: Cluster = 'mainnet-beta'): Connection {
  const customRpc = process.env.EXPO_PUBLIC_SOLANA_RPC_URL;
  const heliusKey = process.env.EXPO_PUBLIC_HELIUS_API_KEY || 'demo';
  const endpoint =
    customRpc ||
    (cluster === 'mainnet-beta'
      ? `https://mainnet.helius-rpc.com/?api-key=${heliusKey}`
      : clusterApiUrl('devnet'));
  return new Connection(endpoint, 'confirmed');
}

// ─── SOL balance ─────────────────────────────────────────────────────────────
export async function fetchSOLBalance(
  connection: Connection,
  walletAddress: string
): Promise<number> {
  try {
    if (!walletAddress || walletAddress.length < 32) return 0;
    const pubkey = new PublicKey(walletAddress);
    const lamports = await connection.getBalance(pubkey);
    return lamports / LAMPORTS_PER_SOL;
  } catch (err) {
    try {
      // Direct JSON-RPC fallback
      const endpoint = connection.rpcEndpoint;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'getBalance',
          params: [walletAddress, { commitment: 'confirmed' }],
        }),
      });
      if (res.ok) {
        const json = await res.json();
        const lamports = json.result?.value ?? 0;
        return lamports / LAMPORTS_PER_SOL;
      }
    } catch (e) {
      console.warn('[wallet] Direct RPC fallback failed:', e);
    }
    return 0;
  }
}

// ─── Transaction confirmation ─────────────────────────────────────────────────
export async function confirmTransaction(
  connection: Connection,
  signature: string,
  maxWaitMs = 30_000
): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    try {
      const status = await connection.getSignatureStatus(signature, {
        searchTransactionHistory: true,
      });
      const val = status?.value;
      if (val?.confirmationStatus === 'confirmed' || val?.confirmationStatus === 'finalized') {
        return true;
      }
      if (val?.err) {
        console.error('[wallet] Transaction failed on-chain:', val.err);
        return false;
      }
    } catch (err) {
      console.warn('[wallet] Status check error:', err);
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  return false;
}

// ─── Phantom Universal Link / Deep-link Connect ──────────────────────────────
export function buildPhantomConnectUrl(appUrl = 'https://stockspend.app', redirectUrl = 'stockspend://'): string {
  const params = new URLSearchParams({
    app_url: appUrl,
    redirect_link: redirectUrl,
    cluster: 'mainnet-beta',
  });
  return `https://phantom.app/ul/v1/connect?${params.toString()}`;
}

export async function openPhantomConnect(): Promise<boolean> {
  try {
    const deepLink = 'phantom://';
    const canOpen = await Linking.canOpenURL(deepLink).catch(() => false);
    if (canOpen) {
      await Linking.openURL(deepLink);
      return true;
    }
    const universalUrl = buildPhantomConnectUrl();
    await Linking.openURL(universalUrl);
    return true;
  } catch (err) {
    console.warn('[wallet] Could not open Phantom:', err);
    return false;
  }
}

// ─── Solflare Deep-link Connect ───────────────────────────────────────────────
export async function openSolflareConnect(): Promise<boolean> {
  try {
    const deepLink = 'solflare://';
    const canOpen = await Linking.canOpenURL(deepLink).catch(() => false);
    if (canOpen) {
      await Linking.openURL(deepLink);
      return true;
    }
    await Linking.openURL('https://solflare.com');
    return true;
  } catch (err) {
    console.warn('[wallet] Could not open Solflare:', err);
    return false;
  }
}

// ─── Robust Wallet detection ──────────────────────────────────────────────────
export async function detectAndConnect(): Promise<{ address?: string; method: 'phantom' | 'solflare' | 'manual' } | null> {
  // Try Phantom first
  const openedPhantom = await openPhantomConnect();
  if (openedPhantom) {
    return { method: 'phantom' };
  }

  // Fallback to Solflare
  const openedSolflare = await openSolflareConnect();
  if (openedSolflare) {
    return { method: 'solflare' };
  }

  return { method: 'manual' };
}
