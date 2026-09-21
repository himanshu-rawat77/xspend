/**
 * Devnet SPL test assets.
 * Mint + merchant are written by `npm run setup:devnet`.
 * Secrets (mint authority, merchant keypair) stay in `.devnet/` (gitignored).
 */
export const DEVNET_TEST_USDC = {
  mint: '5AocAJST1ungzz6tFqEriv2irxYxq3qcRLRr1pJAMV9r',
  decimals: 6 as const,
  symbol: 'tUSDC',
  merchantWallet: '66NMyqnXx1ZXVcVh6p4tPfsiDrmxzFHrDuAAxE4ptsTW',
};

export function isDevnetSplConfigured(): boolean {
  return DEVNET_TEST_USDC.mint.length >= 32 && DEVNET_TEST_USDC.merchantWallet.length >= 32;
}
