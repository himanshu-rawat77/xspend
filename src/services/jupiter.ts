/**
 * Jupiter Swap Service
 * Uses Jupiter Aggregator API v6 to get quotes and build swap transactions.
 *
 * In Demo Mode: returns simulated quote + fake signature.
 * In Live Mode: real API calls + transaction building.
 */

import '../polyfills';
import { Buffer } from 'buffer';
import {
  Connection,
  Transaction,
  VersionedTransaction,
  PublicKey,
  TransactionInstruction,
  TransactionMessage,
  AddressLookupTableAccount,
} from '@solana/web3.js';
import {
  createTransferInstruction,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountIdempotentInstruction,
} from '@solana/spl-token';
import { fetchWithTimeout } from '../utils/fetchHelper';

const JUPITER_QUOTE_API = 'https://quote-api.jup.ag/v6';
export const USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

// ─── Raw Swap Instruction Types ───────────────────────────────────────────────
export interface JupiterInstructionAccount {
  pubkey: string;
  isSigner: boolean;
  isWritable: boolean;
}

export interface JupiterRawInstruction {
  programId: string;
  accounts: JupiterInstructionAccount[];
  data: string;
}

export interface JupiterSwapInstructionsResponse {
  tokenLedgerInstruction?: JupiterRawInstruction;
  computeBudgetInstructions: JupiterRawInstruction[];
  setupInstructions: JupiterRawInstruction[];
  swapInstruction: JupiterRawInstruction;
  cleanupInstruction?: JupiterRawInstruction;
  addressLookupTableAddresses: string[];
  error?: string;
}

export interface AtomicSwapAndPayResult {
  transaction: VersionedTransaction;
  quote: JupiterQuote;
  outAmountUsdc: number;
  priceImpactPct: number;
}

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

export const NATIVE_SOL_MINT = 'So11111111111111111111111111111111111111112';

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
    amount: Math.max(1, Math.floor(amount)).toString(),
    slippageBps: slippageBps.toString(),
    onlyDirectRoutes: 'false',
    asLegacyTransaction: 'false',
  });

  const response = await fetchWithTimeout(
    `${JUPITER_QUOTE_API}/quote?${params.toString()}`,
    {
      headers: {
        Accept: 'application/json',
      },
    },
    8000
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Jupiter quote failed (${response.status}): ${body}`);
  }

  return response.json() as Promise<JupiterQuote>;
}

/**
 * Get a real Jupiter quote for BUYING xStock with SOL or USDC.
 * @param outputMint - Destination xStock token mint address
 * @param amountUSD  - Purchase amount in USD
 * @param inputMint  - 'So11111111111111111111111111111111111111112' (SOL) or USDC mint
 */
export async function getJupiterBuyQuote(
  outputMint: string,
  amountInBaseUnits: number,
  inputMint: string = USDC_MINT,
  slippageBps = 50
): Promise<JupiterQuote> {
  const params = new URLSearchParams({
    inputMint,
    outputMint,
    amount: Math.max(1, Math.floor(amountInBaseUnits)).toString(),
    slippageBps: slippageBps.toString(),
    onlyDirectRoutes: 'false',
    asLegacyTransaction: 'false',
  });

  const response = await fetchWithTimeout(
    `${JUPITER_QUOTE_API}/quote?${params.toString()}`,
    {
      headers: {
        Accept: 'application/json',
      },
    },
    8000
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Jupiter buy quote failed (${response.status}): ${body}`);
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
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
    },
    12000
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
 * Prepare BUY swap (USDC/SOL → xStock) via Jupiter.
 */
export async function prepareBuySwap(
  outputMint: string,
  amountInBaseUnits: number,
  walletAddress: string,
  inputMint: string = USDC_MINT,
  slippageBps = 50
): Promise<{ quote: JupiterQuote; swapTxBase64: string }> {
  const quote = await getJupiterBuyQuote(outputMint, amountInBaseUnits, inputMint, slippageBps);
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

/**
 * Helper to deserialize a Jupiter instruction into a web3 TransactionInstruction
 */
function deserializeJupiterInstruction(ix: JupiterRawInstruction): TransactionInstruction {
  return new TransactionInstruction({
    programId: new PublicKey(ix.programId),
    keys: ix.accounts.map((a) => ({
      pubkey: new PublicKey(a.pubkey),
      isSigner: a.isSigner,
      isWritable: a.isWritable,
    })),
    data: Buffer.from(ix.data, 'base64'),
  });
}

/**
 * Fetch raw swap instructions from Jupiter (instead of prebuilt transaction).
 */
export async function getJupiterSwapInstructions(
  quote: JupiterQuote,
  userPublicKey: string,
  priorityFeeLamports: number | 'auto' = 'auto'
): Promise<JupiterSwapInstructionsResponse> {
  const body = {
    quoteResponse: quote,
    userPublicKey,
    wrapAndUnwrapSol: true,
    prioritizationFeeLamports: priorityFeeLamports,
    dynamicComputeUnitLimit: true,
  };

  const response = await fetchWithTimeout(
    `${JUPITER_QUOTE_API}/swap-instructions`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
    },
    12000
  );

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(`Jupiter swap-instructions failed (${response.status}): ${errBody}`);
  }

  return response.json() as Promise<JupiterSwapInstructionsResponse>;
}

/**
 * Builds an Atomic Swap-and-Send VersionedTransaction (v0).
 * Swaps xStock -> USDC and sends USDC to merchant ATA in one single atomic transaction!
 */
export async function buildAtomicSwapAndPayTransaction({
  connection,
  userPublicKey,
  merchantPublicKey,
  inputMint,
  outputMint = USDC_MINT,
  amountInBaseUnits,
  slippageBps = 50,
  maxPriceImpactPct = 0.02,
}: {
  connection: Connection;
  userPublicKey: PublicKey;
  merchantPublicKey: PublicKey;
  inputMint: string;
  outputMint?: string;
  amountInBaseUnits: number;
  slippageBps?: number;
  maxPriceImpactPct?: number;
}): Promise<AtomicSwapAndPayResult> {
  // 1. Get Jupiter Quote
  const quote = await getJupiterQuote(inputMint, amountInBaseUnits, slippageBps);

  // 2. Safeguard: Check Price Impact
  const priceImpact = parseFloat(quote.priceImpactPct ?? '0');
  if (priceImpact > maxPriceImpactPct) {
    throw new Error(
      `Price impact too high: ${(priceImpact * 100).toFixed(2)}% (Max allowed: ${(
        maxPriceImpactPct * 100
      ).toFixed(2)}%). Aborting for safety.`
    );
  }

  // 3. Fetch Raw Swap Instructions
  const swapIxData = await getJupiterSwapInstructions(quote, userPublicKey.toBase58());
  if (swapIxData.error) {
    throw new Error(`Jupiter swap-instructions error: ${swapIxData.error}`);
  }

  const {
    computeBudgetInstructions = [],
    setupInstructions = [],
    swapInstruction,
    cleanupInstruction,
    addressLookupTableAddresses = [],
  } = swapIxData;

  // 4. Derive ATAs for User and Merchant
  const usdcMintPubkey = new PublicKey(outputMint);
  const userUsdcAta = await getAssociatedTokenAddress(usdcMintPubkey, userPublicKey);
  const merchantUsdcAta = await getAssociatedTokenAddress(usdcMintPubkey, merchantPublicKey);

  // Create idempotent instruction to ensure merchant USDC ATA exists
  const ensureMerchantAtaIx = createAssociatedTokenAccountIdempotentInstruction(
    userPublicKey, // payer
    merchantUsdcAta,
    merchantPublicKey,
    usdcMintPubkey
  );

  // Transfer swapped USDC from user to merchant ATA
  const outAmountBigInt = BigInt(quote.outAmount);
  const transferToMerchantIx = createTransferInstruction(
    userUsdcAta,
    merchantUsdcAta,
    userPublicKey,
    outAmountBigInt
  );

  // 5. Assemble all instructions into single atomic array
  const allInstructions: TransactionInstruction[] = [
    ...computeBudgetInstructions.map(deserializeJupiterInstruction),
    ...setupInstructions.map(deserializeJupiterInstruction),
    deserializeJupiterInstruction(swapInstruction),
    ...(cleanupInstruction ? [deserializeJupiterInstruction(cleanupInstruction)] : []),
    ensureMerchantAtaIx,
    transferToMerchantIx,
  ];

  // 6. Resolve Address Lookup Tables (ALTs)
  const lookupTableAccounts: AddressLookupTableAccount[] = [];
  if (addressLookupTableAddresses && addressLookupTableAddresses.length > 0) {
    const tablePromises = addressLookupTableAddresses.map(async (addr) => {
      try {
        const res = await connection.getAddressLookupTable(new PublicKey(addr));
        return res.value;
      } catch (e) {
        console.warn(`[Jupiter] Failed to fetch lookup table ${addr}:`, e);
        return null;
      }
    });
    const results = await Promise.all(tablePromises);
    for (const item of results) {
      if (item) lookupTableAccounts.push(item);
    }
  }

  // 7. Compile v0 Versioned Transaction
  const { blockhash } = await connection.getLatestBlockhash('confirmed');
  const messageV0 = new TransactionMessage({
    payerKey: userPublicKey,
    recentBlockhash: blockhash,
    instructions: allInstructions,
  }).compileToV0Message(lookupTableAccounts);

  const transaction = new VersionedTransaction(messageV0);

  return {
    transaction,
    quote,
    outAmountUsdc: Number(quote.outAmount) / 1e6,
    priceImpactPct: priceImpact,
  };
}

