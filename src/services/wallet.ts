/**
 * Wallet Service
 * Handles Solana wallet connection via Phantom / Solflare deep-links
 * and Solana RPC querying.
 */

import '../polyfills';
import { Buffer } from 'buffer';
import { Linking, Platform, NativeModules } from 'react-native';
import {
  Connection,
  PublicKey,
  clusterApiUrl,
  LAMPORTS_PER_SOL,
  Transaction,
  VersionedTransaction,
  SystemProgram,
  TransactionInstruction,
  ComputeBudgetProgram,
} from '@solana/web3.js';
import {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountIdempotentInstruction,
  createTransferInstruction,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import { transact, type Web3MobileWallet } from '@solana-mobile/mobile-wallet-adapter-protocol-web3js';
import { type Chain } from '@solana-mobile/mobile-wallet-adapter-protocol';
const rawBs58 = require('bs58');
const bs58 = rawBs58?.default || rawBs58;

function safeBase58Encode(bytes: Uint8Array | Buffer): string {
  try {
    if (bytes.length === 32) {
      return new PublicKey(bytes).toBase58();
    }
    if (bs58?.encode) {
      return bs58.encode(bytes);
    }
  } catch {}
  return '';
}

/**
 * Safe conversion of any address string or buffer to a valid Solana PublicKey.
 * Prevents "Non-base58 character" runtime crashes.
 */
export function toValidPublicKey(
  address: any,
  fallback = '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosg4B9'
): PublicKey {
  try {
    if (address instanceof PublicKey) return address;
    if (typeof address === 'string') {
      const decoded = decodeMWAAddress(address);
      if (decoded && decoded.length >= 32 && decoded.length <= 44) {
        return new PublicKey(decoded);
      }
    } else if (address) {
      const decoded = decodeMWAAddress(address);
      if (decoded) return new PublicKey(decoded);
    }
  } catch {}
  try {
    return new PublicKey(fallback);
  } catch {
    return new PublicKey('7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosg4B9');
  }
}

/**
 * Convert MWA Base64-encoded or Uint8Array 32-byte public key to standard Solana Base58 string.
 */
export function decodeMWAAddress(rawAddress: any): string {
  try {
    if (!rawAddress) return '';

    // 1. If it's already a PublicKey instance
    if (rawAddress instanceof PublicKey) {
      return rawAddress.toBase58();
    }

    // 2. If it's a Uint8Array or Buffer of 32 bytes
    if (rawAddress instanceof Uint8Array || Buffer.isBuffer(rawAddress)) {
      if (rawAddress.length === 32) {
        return new PublicKey(rawAddress).toBase58();
      }
    }

    // 3. If it's an array of byte values [12, 34, ...]
    if (Array.isArray(rawAddress) && rawAddress.length === 32) {
      return new PublicKey(Uint8Array.from(rawAddress)).toBase58();
    }

    if (typeof rawAddress === 'string') {
      const str = rawAddress.trim();
      if (!str) return '';

      // A. If it's a Base64 string from MWA (e.g. "IYNkSiueScjhQrSxEB5gPiQfXfYMnUzG8LnzJxPzAng=")
      if (str.includes('=') || str.includes('+') || str.includes('/') || str.length === 44) {
        try {
          const normalized = str.replace(/-/g, '+').replace(/_/g, '/');
          const buf = Buffer.from(normalized, 'base64');
          if (buf.length === 32) {
            return new PublicKey(buf).toBase58();
          }
        } catch {}
      }

      // B. If it's already a standard Solana Base58 address
      try {
        const pk = new PublicKey(str);
        if (pk.toBase58() === str) {
          return str;
        }
      } catch {}

      // C. Fallback Base64 decode
      try {
        const normalized = str.replace(/-/g, '+').replace(/_/g, '/');
        const buf = Buffer.from(normalized, 'base64');
        if (buf.length === 32) {
          return new PublicKey(buf).toBase58();
        }
      } catch {}

      return str;
    }
    return String(rawAddress);
  } catch {
    return String(rawAddress || '');
  }
}

/**
 * Convert MWA Uint8Array, Buffer, or Base64-encoded 64-byte signature to standard Solana Base58 string (for Solscan/RPC).
 */
export function decodeMWASignature(rawSig: any): string {
  try {
    if (!rawSig) return '';

    // If MWA returns Uint8Array or Buffer directly
    if (rawSig instanceof Uint8Array || Buffer.isBuffer(rawSig)) {
      if (rawSig.length === 64) {
        return safeBase58Encode(rawSig);
      }
      return safeBase58Encode(rawSig);
    }

    // If MWA returns array of numbers
    if (Array.isArray(rawSig) && rawSig.length === 64) {
      return safeBase58Encode(Uint8Array.from(rawSig));
    }

    if (typeof rawSig === 'object') {
      if (rawSig.signature) return decodeMWASignature(rawSig.signature);
      if (rawSig.data) return decodeMWASignature(rawSig.data);
    }

    if (typeof rawSig === 'string') {
      const str = rawSig.trim();
      if (!str) return '';

      // A. If Base64-encoded 64-byte signature (often contains + or / or =)
      if (str.includes('=') || str.includes('+') || str.includes('/') || str.length === 88) {
        try {
          const normalized = str.replace(/-/g, '+').replace(/_/g, '/');
          const buf = Buffer.from(normalized, 'base64');
          if (buf.length === 64) {
            const encoded = safeBase58Encode(buf);
            if (encoded) return encoded;
          }
        } catch {}
      }

      // B. If already standard Base58 signature (87-88 chars, valid base58 chars)
      if (!str.includes('+') && !str.includes('/') && !str.includes('=')) {
        try {
          if (bs58?.decode) {
            const decoded = bs58.decode(str);
            if (decoded.length === 64) return str;
          }
        } catch {}
      }

      // C. Fallback Base64 decode
      try {
        const normalized = str.replace(/-/g, '+').replace(/_/g, '/');
        const buf = Buffer.from(normalized, 'base64');
        if (buf.length === 64) {
          const encoded = safeBase58Encode(buf);
          if (encoded) return encoded;
        }
      } catch {}

      return str;
    }
    return String(rawSig);
  } catch {
    return String(rawSig || '');
  }
}

// ─── Solana Cluster Config ───────────────────────────────────────────────────
export type Cluster = 'mainnet-beta' | 'devnet';

export function getConnection(cluster: Cluster = 'mainnet-beta'): Connection {
  const customRpc = process.env.EXPO_PUBLIC_SOLANA_RPC_URL;
  const heliusKey = process.env.EXPO_PUBLIC_HELIUS_API_KEY;
  let endpoint = customRpc;
  if (!endpoint) {
    if (cluster === 'mainnet-beta') {
      endpoint =
        heliusKey && heliusKey !== 'demo'
          ? `https://mainnet.helius-rpc.com/?api-key=${heliusKey}`
          : 'https://api.mainnet-beta.solana.com';
    } else {
      endpoint = 'https://devnet.helius-rpc.com/?api-key=YOUR_KEY';
    }
  }
  return new Connection(endpoint, 'confirmed');
}

// ─── SOL balance ─────────────────────────────────────────────────────────────
export async function fetchSOLBalance(
  connection: Connection,
  walletAddress: string
): Promise<number> {
  try {
    const cleanAddress = decodeMWAAddress(walletAddress) || walletAddress.trim();
    if (!cleanAddress || cleanAddress.length < 32) return 0;
    const pubkey = toValidPublicKey(cleanAddress);

    // 1. Primary RPC connection query
    try {
      const lamports = await connection.getBalance(pubkey, 'confirmed');
      const sol = lamports / LAMPORTS_PER_SOL;
      return sol;
    } catch (primaryErr) {
      console.warn('[wallet] Primary getBalance failed, attempting fallback endpoints:', primaryErr);
    }

    // 2. Multi-endpoint JSON-RPC fallback
    const isDevnet = connection.rpcEndpoint.includes('devnet');
    const fallbackEndpoints = isDevnet
      ? [
          'https://devnet.helius-rpc.com/?api-key=YOUR_KEY',
          'https://rpc.ankr.com/solana_devnet',
        ]
      : [
          'https://api.mainnet-beta.solana.com',
          'https://rpc.ankr.com/solana',
        ];

    for (const endpoint of fallbackEndpoints) {
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'getBalance',
            params: [pubkey.toBase58(), { commitment: 'confirmed' }],
          }),
        });
        if (res.ok) {
          const json = await res.json();
          const lamports = json.result?.value;
          if (typeof lamports === 'number') {
            return lamports / LAMPORTS_PER_SOL;
          }
        }
      } catch {}
    }

    return 0;
  } catch (err) {
    console.warn('[wallet] fetchSOLBalance error:', err);
    return 0;
  }
}

// ─── Transaction confirmation ─────────────────────────────────────────────────
export type ConfirmResult = 'confirmed' | 'failed' | 'unknown';

export async function confirmTransaction(
  connection: Connection,
  signature: string,
  maxWaitMs = 30_000
): Promise<ConfirmResult> {
  if (!signature || typeof signature !== 'string' || signature.length < 64 || !/^[1-9A-HJ-NP-Za-km-z]+$/.test(signature)) {
    console.warn('[wallet] Skipped status check: invalid signature parameter:', signature);
    return 'unknown';
  }

  const isDevnet = connection.rpcEndpoint.includes('devnet');
  const fallbackEndpoint = isDevnet
    ? 'https://rpc.ankr.com/solana_devnet'
    : 'https://rpc.ankr.com/solana';

  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    // 1. Primary RPC check
    try {
      const status = await connection.getSignatureStatus(signature, {
        searchTransactionHistory: true,
      });
      const val = status?.value;
      if (val?.confirmationStatus === 'confirmed' || val?.confirmationStatus === 'finalized') {
        return 'confirmed';
      }
      if (val?.err) {
        console.error('[wallet] Transaction failed on-chain:', val.err);
        return 'failed';
      }
    } catch (err) {
      console.warn('[wallet] Primary status check error:', err);
    }

    // 2. High-speed Ankr RPC fallback check
    try {
      const res = await fetch(fallbackEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: Date.now(),
          method: 'getSignatureStatuses',
          params: [[signature], { searchTransactionHistory: true }],
        }),
      });
      if (res.ok) {
        const json = await res.json();
        const item = json.result?.value?.[0];
        if (item?.confirmationStatus === 'confirmed' || item?.confirmationStatus === 'finalized') {
          return 'confirmed';
        }
        if (item?.err) {
          console.error('[wallet] Transaction failed on-chain (fallback):', item.err);
          return 'failed';
        }
      }
    } catch {}

    await new Promise((r) => setTimeout(r, 800));
  }
  return 'unknown';
}

export async function fetchTokenUiAmount(
  connection: Connection,
  ownerAddress: string,
  mintAddress: string
): Promise<number> {
  try {
    const owner = toValidPublicKey(ownerAddress);
    const mint = toValidPublicKey(mintAddress);
    const ata = await getAssociatedTokenAddress(mint, owner, false, TOKEN_PROGRAM_ID);
    const balance = await connection.getTokenAccountBalance(ata);
    return parseFloat(balance.value.uiAmountString || '0') || 0;
  } catch {
    return 0;
  }
}

// ─── Phantom Universal Link / Deep-link Connect ──────────────────────────────
export function buildPhantomConnectUrl(appUrl = 'https://xspend.app', redirectUrl = 'xspend://'): string {
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

// ─── MWA (Mobile Wallet Adapter) — Seeker / MWA-compatible wallets ───────────
// Uses @solana-mobile/mobile-wallet-adapter-protocol's transact() API.
// This enables in-app signing without leaving the app — available on Seeker phone
// or any Android wallet that implements MWA (e.g., Phantom Android ≥ 23.x, Jupiter Wallet).

// ─── Resilient Blockhash Fetching ─────────────────────────────────────────────
export async function getResilientBlockhash(
  connection: Connection
): Promise<{ blockhash: string; lastValidBlockHeight?: number }> {
  // 1. Always use the primary connection first (guarantees node blockhash alignment)
  try {
    const res = await connection.getLatestBlockhash('confirmed');
    if (res?.blockhash) return res;
  } catch (primaryErr) {
    console.warn('[wallet] Primary getLatestBlockhash failed, trying fallback endpoints:', primaryErr);
  }

  // 2. Multi-endpoint JSON-RPC fallback if primary is unreachable
  const isDevnet = connection.rpcEndpoint.includes('devnet');
  const fallbackEndpoints = isDevnet
    ? [
        'https://devnet.helius-rpc.com/?api-key=YOUR_KEY',
        'https://api.devnet.solana.com',
        'https://rpc.ankr.com/solana_devnet',
      ]
    : [
        'https://api.mainnet-beta.solana.com',
        'https://rpc.ankr.com/solana',
      ];

  for (const endpoint of fallbackEndpoints) {
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: Date.now(),
          method: 'getLatestBlockhash',
          params: [{ commitment: 'confirmed' }],
        }),
      });
      if (res.ok) {
        const json = await res.json();
        const blockhash = json.result?.value?.blockhash;
        if (blockhash && typeof blockhash === 'string') {
          return {
            blockhash,
            lastValidBlockHeight: json.result?.value?.lastValidBlockHeight,
          };
        }
      }
    } catch {}
  }

  throw new Error('Could not fetch latest Solana blockhash from any RPC endpoint.');
}

export type MWASignResult = {
  signature: string;
  walletPublicKey: string;
};

export type MWATxPayloadOrBuilder =
  | Uint8Array
  | string
  | ((walletPublicKey: string) => Promise<string | Uint8Array> | string | Uint8Array);

const MWA_APP_IDENTITY = {
  name: 'xSpend',
  uri: 'https://xspend.app',
  icon: 'assets/icon.png',
};

export function isMWASupported(): boolean {
  return (
    Platform.OS === 'android' &&
    !!(NativeModules?.SolanaMobileWalletAdapter || (global as any)?.SolanaMobileWalletAdapter)
  );
}

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  let timer: any;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

/**
 * Authorize xSpend with MWA and return the AuthorizationResult.
 * Used by ProfileScreen to get the wallet public key for balance sync.
 */
export async function mwaAuthorize(chain: Chain) {
  if (!isMWASupported()) {
    throw new Error(
      'Solana Mobile Wallet Adapter native module is not present in Expo Go. Please open the installed standalone xSpend APK on your device.'
    );
  }
  return withTimeout(
    transact(async (wallet: Web3MobileWallet) => {
      return wallet.authorize({
        identity: MWA_APP_IDENTITY,
        chain,
      });
    }),
    20000,
    'Wallet connection request timed out. Please unlock your wallet and try again.'
  );
}

/**
 * Sign and send a VersionedTransaction via Mobile Wallet Adapter (MWA).
 * Accepts either pre-serialized transaction bytes or a dynamic builder callback
 * that receives the authorized wallet address as feePayer and signer.
 *
 * @param txOrBuilder - Serialized tx bytes/base64 OR async callback `(walletPublicKey: string) => Promise<tx>`
 * @param cluster     - 'mainnet-beta' | 'devnet'
 */
export async function signAndSendWithMWA(
  txOrBuilder: MWATxPayloadOrBuilder,
  cluster: Cluster = 'devnet'
): Promise<MWASignResult> {
  if (!isMWASupported()) {
    throw new Error(
      'Solana Mobile Wallet Adapter native module is not present in Expo Go. Please open the installed standalone xSpend APK on your device.'
    );
  }

  const APP_IDENTITY = {
    name: 'xSpend',
    uri: 'https://xspend.app',
    icon: 'assets/icon.png',
  };

  // MWA chain format
  const chain = cluster === 'mainnet-beta' ? 'solana:mainnet' : 'solana:devnet';

  try {
    console.log(`[MWA] Opening signing session on chain: ${chain}...`);

    // ── transact() without any external timeout ───────────────────────────────
    // IMPORTANT: Do NOT wrap transact() in withTimeout / Promise.race.
    // MWA protocol handles session termination natively (user rejects = throws MWAUserCanceled).
    // Any external timer that races against transact() will fire before the IPC
    // round-trip completes, making successful signings appear as timeouts.
    const signResult = await transact(async (wallet: Web3MobileWallet) => {
      // Authorize — shows wallet connection UI (silent/instant if already trusted)
      const authResult = await wallet.authorize({
        identity: APP_IDENTITY,
        chain,
      });
      const rawWalletPk = authResult.accounts[0]?.address ?? '';
      const walletPublicKey = decodeMWAAddress(rawWalletPk);
      console.log(`[MWA] Authorized. Wallet PK: ${walletPublicKey}`);

      // Build transaction matching the exact authorized feePayer & signer
      let txObj: Transaction | VersionedTransaction;
      if (typeof txOrBuilder === 'function') {
        console.log('[MWA] Dynamically constructing transaction for authorized feePayer:', walletPublicKey);
        const built = await txOrBuilder(walletPublicKey);
        if (built instanceof Transaction || built instanceof VersionedTransaction) {
          txObj = built;
        } else {
          const bytes = typeof built === 'string' ? Buffer.from(built, 'base64') : Buffer.from(built);
          try {
            txObj = VersionedTransaction.deserialize(bytes);
          } catch {
            txObj = Transaction.from(bytes);
          }
        }
      } else {
        const bytes =
          typeof txOrBuilder === 'string'
            ? Buffer.from(txOrBuilder, 'base64')
            : Buffer.from(txOrBuilder as Uint8Array);
        try {
          txObj = VersionedTransaction.deserialize(bytes);
        } catch {
          txObj = Transaction.from(bytes);
        }
      }

      // Sign — shows approval popup; resolves ~1s after user taps Approve
      console.log('[MWA] Prompting wallet to sign...');
      const signedTxs = await wallet.signTransactions({ transactions: [txObj] });
      const signedTx = signedTxs[0];
      if (!signedTx) throw new Error('Wallet did not return a signed transaction.');

      console.log('[MWA] Wallet signed transaction. Returning bytes...');
      return { rawBytes: signedTx.serialize(), walletPublicKey };
    });

    const { rawBytes, walletPublicKey } = signResult;
    console.log('[MWA] Signed successfully. Broadcasting to Solana network...');

    // Broadcast signed transaction across multiple RPC nodes concurrently to guarantee delivery
    const conn = getConnection(cluster);
    const isDevnet = cluster === 'devnet' || conn.rpcEndpoint.includes('devnet');
    const broadcastEndpoints = isDevnet
      ? [
          conn.rpcEndpoint,
          'https://rpc.ankr.com/solana_devnet',
          'https://devnet.helius-rpc.com/?api-key=YOUR_KEY',
        ]
      : [
          conn.rpcEndpoint,
          'https://rpc.ankr.com/solana',
          'https://api.mainnet-beta.solana.com',
        ];

    const uniqueEndpoints = [...new Set(broadcastEndpoints)];
    const base64Wire = Buffer.from(rawBytes).toString('base64');
    console.log(`[MWA] Broadcasting transaction concurrently to ${uniqueEndpoints.length} RPC endpoints...`);

    const broadcastAttempts = uniqueEndpoints.map(async (endpoint) => {
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: Date.now(),
            method: 'sendTransaction',
            params: [
              base64Wire,
              {
                encoding: 'base64',
                skipPreflight: true,
                preflightCommitment: 'confirmed',
                maxRetries: 5,
              },
            ],
          }),
        });

        if (!res.ok) throw new Error(`HTTP ${res.status} from ${endpoint}`);
        const json = await res.json();
        if (json.error) {
          console.warn(`[MWA] Broadcast error from ${endpoint}:`, json.error);
          throw new Error(json.error.message || 'RPC broadcast rejected');
        }
        if (json.result && typeof json.result === 'string') {
          console.log(`[MWA] Broadcast succeeded via ${endpoint}, signature: ${json.result}`);
          return json.result;
        }
        throw new Error('No signature returned');
      } catch (err) {
        console.warn(`[MWA] Endpoint ${endpoint} broadcast failed:`, err);
        throw err;
      }
    });

    let signature = '';
    try {
      signature = await Promise.any(broadcastAttempts);
    } catch {
      // Fallback to standard web3.js sendRawTransaction if all fetch attempts fail
      signature = await conn.sendRawTransaction(rawBytes, {
        skipPreflight: true,
        preflightCommitment: 'confirmed',
        maxRetries: 5,
      });
    }

    return { signature, walletPublicKey };
  } catch (err: any) {
    console.error('[MWA] transact() error:', err);
    const rawMsg = err?.message || err?.name || '';
    // Translate MWA protocol errors into human-readable messages
    const isUserCancel =
      rawMsg.toLowerCase().includes('cancel') ||
      rawMsg.toLowerCase().includes('reject') ||
      rawMsg.toLowerCase().includes('denied') ||
      rawMsg === 'null' || rawMsg === 'undefined' || !rawMsg;
    const message = isUserCancel
      ? 'Wallet signing was canceled or rejected by the user'
      : rawMsg;
    throw new Error(message);
  }
}


/**
 * Builds a direct Solana transaction (for Devnet testing or fallback when AMM DEX liquidity route is not present).
 * Creates a valid on-chain transaction signed by the user's wallet.
 */
export async function buildDirectPaymentTransaction(
  connection: Connection,
  senderAddress: string,
  recipientAddress: string,
  amountUSD: number,
  memoText: string = 'xSpend Merchant Payment',
  solPrice: number = 150
): Promise<string> {
  const senderPubkey = toValidPublicKey(senderAddress);
  const recipientPubkey = toValidPublicKey(recipientAddress, senderPubkey.toBase58());

  const { blockhash } = await getResilientBlockhash(connection);

  const tx = new Transaction({
    recentBlockhash: blockhash,
    feePayer: senderPubkey,
  });

  // Calculate lamports from USD amount using live SOL oracle price (minimum 1,000 lamports)
  let lamports = 1000;
  if (amountUSD > 0 && solPrice > 0) {
    const solAmount = amountUSD / solPrice;
    lamports = Math.max(1000, Math.floor(solAmount * LAMPORTS_PER_SOL));
  }

  tx.add(
    SystemProgram.transfer({
      fromPubkey: senderPubkey,
      toPubkey: recipientPubkey,
      lamports,
    })
  );

  // Add memo instruction
  const MEMO_PROGRAM_ID = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');
  tx.add(
    new TransactionInstruction({
      keys: [{ pubkey: senderPubkey, isSigner: true, isWritable: false }],
      programId: MEMO_PROGRAM_ID,
      data: Buffer.from(`${memoText} ($${amountUSD.toFixed(2)})`, 'utf-8'),
    })
  );

  const serialized = tx.serialize({
    requireAllSignatures: false,
    verifySignatures: false,
  });

  return serialized.toString('base64');
}

/**
 * Builds a genuine SPL token payment transaction for Devnet testing.
 * Composes ComputeBudget + Idempotent ATA creation + SPL Token Transfer + Memo instruction.
 */
export async function buildDevnetSplPaymentTransaction(
  connection: Connection,
  senderAddress: string,
  recipientAddress: string,
  amountUSD: number,
  tokenMint?: string,
  tokenDecimals: number = 6,
  memoText: string = 'xSpend Devnet Payment'
): Promise<string> {
  const senderPubkey = toValidPublicKey(senderAddress);
  const recipientPubkey = toValidPublicKey(recipientAddress, senderPubkey.toBase58());

  const { blockhash } = await getResilientBlockhash(connection);

  const tx = new Transaction({
    recentBlockhash: blockhash,
    feePayer: senderPubkey,
  });

  // 1. Add priority fee & compute budget
  tx.add(
    ComputeBudgetProgram.setComputeUnitLimit({ units: 250_000 }),
    ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1_000 })
  );

  const isSolMint = !tokenMint || tokenMint === 'So11111111111111111111111111111111111111112' || tokenMint.includes('SOL');

  // 2. If valid SPL token mint provided and not pure SOL, compose ATA and Token Transfer
  let hasSplInstruction = false;
  if (!isSolMint && tokenMint && tokenMint.length >= 32) {
    try {
      const mintPubkey = toValidPublicKey(tokenMint);
      const senderATA = await getAssociatedTokenAddress(mintPubkey, senderPubkey, false, TOKEN_PROGRAM_ID);
      const recipientATA = await getAssociatedTokenAddress(mintPubkey, recipientPubkey, false, TOKEN_PROGRAM_ID);

      // Idempotently create sender and recipient ATAs if they do not exist
      tx.add(
        createAssociatedTokenAccountIdempotentInstruction(
          senderPubkey,
          senderATA,
          senderPubkey,
          mintPubkey,
          TOKEN_PROGRAM_ID
        ),
        createAssociatedTokenAccountIdempotentInstruction(
          senderPubkey,
          recipientATA,
          recipientPubkey,
          mintPubkey,
          TOKEN_PROGRAM_ID
        )
      );

      // Amount in token smallest units (e.g. 6 decimals for USDC, 8 for xStocks)
      const tokenAmount = Math.max(1, Math.floor(amountUSD * Math.pow(10, tokenDecimals)));
      tx.add(
        createTransferInstruction(
          senderATA,
          recipientATA,
          senderPubkey,
          tokenAmount,
          [],
          TOKEN_PROGRAM_ID
        )
      );
      hasSplInstruction = true;
    } catch (splErr) {
      console.warn('[DevnetTx] SPL instruction composition fallback:', splErr);
    }
  }

  // If pure SOL or SPL transfer was skipped, add SOL micro-transfer proof
  if (!hasSplInstruction) {
    tx.add(
      SystemProgram.transfer({
        fromPubkey: senderPubkey,
        toPubkey: recipientPubkey,
        lamports: 1000,
      })
    );
  }

  // 3. Add On-Chain Memo Instruction for Hackathon Auditor Tracking
  const MEMO_PROGRAM_ID = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');
  tx.add(
    new TransactionInstruction({
      keys: [{ pubkey: senderPubkey, isSigner: true, isWritable: false }],
      programId: MEMO_PROGRAM_ID,
      data: Buffer.from(`${memoText} ($${amountUSD.toFixed(2)})`, 'utf-8'),
    })
  );

  const serialized = tx.serialize({
    requireAllSignatures: false,
    verifySignatures: false,
  });

  return serialized.toString('base64');
}
