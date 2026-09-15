/**
 * Jupiter Swap Service
 * Uses Jupiter Aggregator API v6 to get quotes and build swap transactions.
 *
 * In Demo Mode: returns simulated quote + fake signature.
 * In Live Mode: real API calls + transaction building.
 */

import { Connection, Transaction, VersionedTransaction, PublicKey } from '@solana/web3.js';
import { fetchWithTimeout } from '../utils/fetchHelper';

const JUPITER_QUOTE_API = 'https://quote-api.jup.ag/v6';
const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface JupiterQuote {
  inputMint: string;
  inAmount: string;
  outputMint: string;
  outAmount: string;
  otherAmountThreshold: string;
  swapMode: string;
  slippageBps: number;
  priceImpactPct: string;
  routePlan: Array<{
    swapInfo: {
      ammKey: string;
      label: string;
      inputMint: string;
      outputMint: string;
      inAmount: string;
      outAmount: string;
      feeAmount: string;
      feeMint: string;
    };
    percent: number;
  }>;
}

export interface SwapResult {
  signature: string;
  inputAmountUi: number;
  outputAmountUi: number;
  priceImpactPct: number;
  fee: number;
}

// ─── Demo Mode ────────────────────────────────────────────────────────────────
export function mockJupiterQuote(
  inputMintTicker: string,
  amountUSD: number,
  pricePerToken: number,
  slippageBps = 50
): JupiterQuote {
  const tokens = amountUSD / pricePerToken;
  const tokenDecimals = 1e6; // USDC 6 decimals
  const outAmount = Math.floor(amountUSD * tokenDecimals);
  const inAmount = Math.floor(tokens * 1e8); // 8 decimals for xStocks

  return {
    inputMint: `MOCK_${inputMintTicker}`,
    inAmount: inAmount.toString(),
    outputMint: USDC_MINT,
    outAmount: outAmount.toString(),
    otherAmountThreshold: Math.floor(outAmount * 0.995).toString(),
    swapMode: 'ExactIn',
    slippageBps,
    priceImpactPct: (0.01 + Math.random() * 0.03).toFixed(4),
    routePlan: [
      {
        swapInfo: {
          ammKey: 'ORCA_AMM',
          label: `Orca (${inputMintTicker} → USDC)`,
          inputMint: `MOCK_${inputMintTicker}`,
          outputMint: USDC_MINT,
          inAmount: inAmount.toString(),
          outAmount: outAmount.toString(),
          feeAmount: '500',
          feeMint: USDC_MINT,
        },
        percent: 100,
      },
    ],
  };
}

// ─── Live Mode ────────────────────────────────────────────────────────────────

/**
 * Get a real Jupiter quote for swapping xStock → USDC.
 * @param inputMint  - Source token mint address
 * @param amount     - Amount in token base units (e.g. lamports equivalent)
 * @param slippageBps - Slippage in basis points (50 = 0.5%)
 */
export async function getJupiterQuote(
  inputMint: string,
  amount: number,
  slippageBps = 50
): Promise<JupiterQuote> {
  const params = new URLSearchParams({
    inputMint,
    outputMint: USDC_MINT,
    amount: Math.floor(amount).toString(),
    slippageBps: slippageBps.toString(),
    onlyDirectRoutes: 'false',
    asLegacyTransaction: 'false',
  });

  const response = await fetchWithTimeout(
    `${JUPITER_QUOTE_API}/quote?${params.toString()}`,
    {},
    10000
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Jupiter quote failed (${response.status}): ${body}`);
  }

  return response.json() as Promise<JupiterQuote>;
}

/**
 * Build a swap transaction from a Jupiter quote.
 * Returns a base64-encoded VersionedTransaction ready for signing.
 */
export async function buildSwapTransaction(
  quote: JupiterQuote,
  userPublicKey: string,
  priorityFeeeLamports = 10_000
): Promise<string> {
  const body = {
    quoteResponse: quote,
    userPublicKey,
    wrapAndUnwrapSol: true,
    prioritizationFeeLamports: priorityFeeeLamports,
    dynamicComputeUnitLimit: true,
  };

  const response = await fetchWithTimeout(
    `${JUPITER_QUOTE_API}/swap`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
    15000
  );

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`Jupiter swap build failed (${response.status}): ${errBody}`);
  }

  const { swapTransaction } = await response.json();
  return swapTransaction; // base64 VersionedTransaction
}

/**
 * Deserialize the base64 swap transaction into a VersionedTransaction object.
 */
export function deserializeSwapTransaction(base64Tx: string): VersionedTransaction {
  const buffer = Buffer.from(base64Tx, 'base64');
  return VersionedTransaction.deserialize(buffer);
}

/**
 * Full swap flow: quote → build → sign → send → confirm.
 * Signing is done by the caller (wallet adapter) — this returns the unsigned tx.
 */
export async function prepareSwap(
  inputMint: string,
  amountBaseUnits: number,
  walletAddress: string,
  slippageBps = 50
): Promise<{ quote: JupiterQuote; swapTxBase64: string }> {
  const quote = await getJupiterQuote(inputMint, amountBaseUnits, slippageBps);
  const swapTxBase64 = await buildSwapTransaction(quote, walletAddress);
  return { quote, swapTxBase64 };
}

/**
 * Submit a signed transaction to the Solana network via Jupiter's endpoint.
 */
export async function sendSignedTransaction(
  connection: Connection,
  signedTx: VersionedTransaction
): Promise<string> {
  const rawTx = signedTx.serialize();
  const signature = await connection.sendRawTransaction(rawTx, {
    skipPreflight: false,
    maxRetries: 3,
  });
  return signature;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
export function uiAmountFromBaseUnits(baseUnits: string, decimals: number): number {
  return parseInt(baseUnits, 10) / Math.pow(10, decimals);
}

export function baseUnitsFromUiAmount(uiAmount: number, decimals: number): number {
  return Math.floor(uiAmount * Math.pow(10, decimals));
}
