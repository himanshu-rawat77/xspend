export type Timeframe = '1D' | '5D' | '1W' | '1M' | '3M' | '6M';

export interface ChartPoint {
  date: string;
  price: number;
  open?: number;
  close?: number;
  high?: number;
  low?: number;
}

export interface Stock {
  id: string;
  ticker: string; // e.g. "MSFT"
  tokenTicker: string; // e.g. "MSFTx"
  name: string; // e.g. "Microsoft Corporation"
  shortName: string; // e.g. "Microsoft Co."
  logo: string;
  logoColor: string;
  price: number;
  change24h: number; // percentage, e.g. +10.21
  marketCap: string; // e.g. "$1780.09B"
  volume24h: string;
  solanaMint: string;
  holdings: number; // shares held by user
  investedValue: number; // USD value held
  sparkline: number[]; // mini trend points
  historicalData: Record<Timeframe, ChartPoint[]>;
}

export interface Merchant {
  id: string;
  name: string;
  category: string;
  logo: string;
  logoColor: string;
  hasXStock: boolean;
  associatedStockId?: string; // ticker if brand has stock, e.g. "AAPL"
  rewardDescription: string;
  defaultSpendPresets: number[];
}

export interface SpendTransaction {
  id: string;
  timestamp: number;
  merchantName: string;
  merchantId: string;
  amountUSD: number;
  stockSoldTicker: string;
  stockSoldAmount: number;
  stockSoldPrice: number;
  rewardType: 'brand_stock' | 'same_brand_bonus' | 'protocol_token';
  rewardTicker: string;
  rewardAmount: number;
  rewardValueUSD: number;
  solanaTxSignature: string;
  jupiterRoute: {
    inToken: string;
    outToken: string;
    slippage: number;
    priceImpact: number;
  };
}

export interface MarketNews {
  id: string;
  ticker: string;
  companyName: string;
  headline: string;
  source: string;
  date: string;
  logo: string;
  logoColor: string;
}

export type ActiveTab = 'summary' | 'markets' | 'portfolio' | 'history' | 'settings';

export type LiquidationStrategy = 'highest_gain' | 'lowest_volatility' | 'fifo' | 'same_brand_first';

export interface UserPreferences {
  sameBrandBonusEnabled: boolean;
  smartRouting: boolean;
  liquidationStrategy: LiquidationStrategy;
  preferredNetwork: 'solana-mainnet' | 'solana-devnet';
  userName: string;
  avatarUrl: string;
}
