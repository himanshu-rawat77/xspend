/**
 * Rewards Service
 * Calculates and dispatches StockBack rewards after a successful spend.
 *
 * Reward rules:
 *   - Same-brand + bonus enabled: 1.5% of spend in brand xStock
 *   - Brand xStock exists:        1.0% of spend in brand xStock
 *   - No brand xStock:            1.0% in xToken protocol points
 */

export type RewardType = 'same_brand_bonus' | 'brand_stock' | 'protocol_token';

export interface RewardCalculation {
  rewardType: RewardType;
  rewardTicker: string;
  rewardAmountTokens: number;  // tokens (fractional)
  rewardValueUSD: number;      // USD equivalent
  multiplier: number;          // 1.0 or 1.5
  ratePct: number;             // 1.0 or 1.5
}

export interface RewardInput {
  spendAmountUSD: number;
  merchantHasXStock: boolean;
  brandXStockTicker: string | null;
  brandXStockPrice: number;       // current price
  sourceStockTicker: string;      // stock user paid with
  merchantAssociatedTicker: string | null;
  sameBrandBonusEnabled: boolean;
}

// ─── Core Calculation ─────────────────────────────────────────────────────────
export function calculateReward(input: RewardInput): RewardCalculation {
  const {
    spendAmountUSD,
    merchantHasXStock,
    brandXStockTicker,
    brandXStockPrice,
    sourceStockTicker,
    merchantAssociatedTicker,
    sameBrandBonusEnabled,
  } = input;

  const isSameBrand =
    !!merchantAssociatedTicker &&
    sourceStockTicker.replace('x', '') === merchantAssociatedTicker.replace('x', '');

  if (merchantHasXStock && brandXStockTicker && brandXStockPrice > 0) {
    // Brand has an xStock — reward in it
    const isBonusEligible = isSameBrand && sameBrandBonusEnabled;
    const ratePct = isBonusEligible ? 1.5 : 1.0;
    const multiplier = isBonusEligible ? 1.5 : 1.0;
    const rewardValueUSD = spendAmountUSD * (ratePct / 100);
    const rewardAmountTokens = rewardValueUSD / brandXStockPrice;

    return {
      rewardType: isBonusEligible ? 'same_brand_bonus' : 'brand_stock',
      rewardTicker: brandXStockTicker,
      rewardAmountTokens,
      rewardValueUSD,
      multiplier,
      ratePct,
    };
  } else {
    // No brand xStock — give protocol xToken points
    // 1 xToken point = $0.01 value, so rewardAmount = spendAmountUSD * 1.0
    const rewardValueUSD = spendAmountUSD * 0.01;
    const rewardAmountTokens = spendAmountUSD * 1.0; // 1:1 points ratio

    return {
      rewardType: 'protocol_token',
      rewardTicker: 'xToken',
      rewardAmountTokens,
      rewardValueUSD,
      multiplier: 1.0,
      ratePct: 1.0,
    };
  }
}

// ─── Reward summary text ───────────────────────────────────────────────────────
export function rewardSummaryText(reward: RewardCalculation): string {
  if (reward.rewardType === 'same_brand_bonus') {
    return `🔥 ${reward.ratePct}% same-brand bonus! +${reward.rewardAmountTokens.toFixed(6)} ${reward.rewardTicker}`;
  }
  if (reward.rewardType === 'brand_stock') {
    return `⚡ ${reward.ratePct}% StockBack! +${reward.rewardAmountTokens.toFixed(6)} ${reward.rewardTicker}`;
  }
  return `✨ ${Math.round(reward.rewardAmountTokens)} xToken points earned`;
}

// ─── Reward badge color ───────────────────────────────────────────────────────
export function rewardBadgeColor(rewardType: RewardType): string {
  switch (rewardType) {
    case 'same_brand_bonus':
      return '#C6FF00'; // Lime — max bonus
    case 'brand_stock':
      return '#60A5FA'; // Blue — brand stock
    case 'protocol_token':
      return '#A78BFA'; // Purple — xToken points
    default:
      return '#9CA3AF';
  }
}

// ─── In Live Mode: dispatch reward on-chain ────────────────────────────────────
/**
 * In a real implementation, this would:
 * 1. Sign a SPL token transfer (brand xStock) from treasury → user wallet
 * 2. Or mint xToken points via program CPI
 *
 * For now it's a placeholder that logs and returns a mock signature.
 */
export async function dispatchReward(
  reward: RewardCalculation,
  recipientWallet: string,
  isDemo = true
): Promise<string | null> {
  if (isDemo) {
    console.log('[rewards] Demo mode — simulating reward dispatch:', reward);
    await new Promise((r) => setTimeout(r, 800));
    return `REWARD_${Date.now()}_MOCK`;
  }

  // TODO: Live mode — SPL token transfer from reward treasury
  // This requires a treasury keypair / program authority
  console.warn('[rewards] Live reward dispatch not yet implemented');
  return null;
}
