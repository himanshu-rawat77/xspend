import '../polyfills';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { fetchTokenUiAmount } from './wallet';
import { DEVNET_TEST_USDC, isDevnetSplConfigured } from '../config/devnet';

export const DEVNET_MINTS = {
  USDC: DEVNET_TEST_USDC.mint || '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
  AAPLx: 'XsbEhLAtcf6HdfpFZ5xEMdqW8nfAvcsP5bdudRLJzJp',
  TSLAx: 'XsDoVfqeBukxuZHWhdvWHBhgEHjGNst4MLodqsJHzoB',
  NVDAx: 'Xsc9qvGR1efVDFGLrVsmkzv3qi45LTBjeUKSPmx9qEh',
  MSFTx: 'XspzcW1PRtgf6Wj92HCiZdjzKCyFekVD8P5Ueh3dRMX',
};

export interface FaucetClaimResult {
  success: boolean;
  solAirdropped: number;
  tokensClaimed: { ticker: string; amount: number }[];
  signature?: string;
  error?: string;
}

/**
 * Requests 1.0 SOL airdrop on Solana Devnet.
 */
export async function requestDevnetSolAirdrop(
  connection: Connection,
  walletAddress: string
): Promise<string> {
  try {
    const pubkey = new PublicKey(walletAddress);
    const signature = await connection.requestAirdrop(pubkey, 1 * LAMPORTS_PER_SOL);
    const latestBlockHash = await connection.getLatestBlockhash();
    await connection.confirmTransaction({
      blockhash: latestBlockHash.blockhash,
      lastValidBlockHeight: latestBlockHash.lastValidBlockHeight,
      signature,
    });
    return signature;
  } catch (err: any) {
    console.warn('[faucet] SOL airdrop warning:', err);
    throw new Error(err?.message || 'SOL airdrop rate limit reached. Try again in 1 minute.');
  }
}

/**
 * Claims Devnet SOL for fees and reports the real test-USDC ATA balance.
 * Does not mint tokens from the app — minting is `npm run setup:devnet`.
 */
export async function claimDevnetTestPackage(
  connection: Connection,
  walletAddress: string
): Promise<FaucetClaimResult> {
  try {
    if (!walletAddress) {
      throw new Error('Connect a wallet first to claim test tokens');
    }

    let solSig: string | undefined;
    let solAirdropped = 0;
    try {
      solSig = await requestDevnetSolAirdrop(connection, walletAddress);
      solAirdropped = 1.0;
    } catch (e) {
      console.warn('[faucet] Sol airdrop skipped or throttled:', e);
    }

    const tokensClaimed: { ticker: string; amount: number }[] = [];
    if (isDevnetSplConfigured()) {
      const tusdc = await fetchTokenUiAmount(connection, walletAddress, DEVNET_TEST_USDC.mint);
      tokensClaimed.push({ ticker: 'tUSDC', amount: tusdc });
      if (tusdc <= 0) {
        return {
          success: solAirdropped > 0,
          solAirdropped,
          tokensClaimed,
          signature: solSig,
          error: 'Wallet has 0 tUSDC. Mint test tokens with: npm run setup:devnet -- --wallet ' + walletAddress,
        };
      }
    } else {
      return {
        success: solAirdropped > 0,
        solAirdropped,
        tokensClaimed,
        signature: solSig,
        error: 'Test USDC mint not configured. Run: npm run setup:devnet -- --wallet ' + walletAddress,
      };
    }

    return {
      success: true,
      solAirdropped,
      tokensClaimed,
      signature: solSig,
    };
  } catch (err: any) {
    return {
      success: false,
      solAirdropped: 0,
      tokensClaimed: [],
      error: err?.message || 'Failed to claim faucet tokens.',
    };
  }
}
