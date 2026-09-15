import { create } from 'zustand';
import { Stock, SpendTransaction, UserPreferences, LiquidationStrategy } from '../types';
import { INITIAL_STOCKS } from '../data/mockStocks';
import { MERCHANTS } from '../data/mockMerchants';
import { generateSolanaSignature } from '../utils/formatters';
import { fetchLiveStockPrices, fetchFullPortfolio, XSTOCK_REGISTRY } from '../services/xstocks';
import { getConnection, fetchSOLBalance } from '../services/wallet';

interface StockState {
  // Stocks & Holdings
  stocks: Stock[];
  selectedStockId: string;
  totalPortfolioValue: number;
  totalInvested: number; // e.g. $4,389.80 for the specific portfolio view
  
  // Rewards & Points
  xTokenPoints: number;
  accumulatedStockBackUSD: number;
  
  // Wallet
  walletAddress: string;
  solBalance: number;
  usdcBalance: number;
  isWalletConnected: boolean;
  
  // Spend Transaction History
  transactions: SpendTransaction[];
  
  // User Preferences
  preferences: UserPreferences;
  
  // Actions
  setSelectedStockId: (id: string) => void;
  refreshLivePrices: () => Promise<void>;
  syncRealBalances: () => Promise<void>;
  isRefreshingPrices: boolean;
  isSyncingBalances: boolean;
  setWalletAddress: (address: string) => void;
  setSolBalance: (balance: number) => void;
  setUsdcBalance: (balance: number) => void;
  executeSpend: (
    merchantId: string,
    amountUSD: number,
    preferredStockTicker?: string,
    customMerchantName?: string
  ) => SpendTransaction | null;
  buyStock: (stockId: string, amountUSD: number) => boolean;
  sellStock: (stockId: string, shares: number) => boolean;
  depositFunds: (amountUSD: number) => void;
  withdrawFunds: (amountUSD: number) => boolean;
  setSameBrandBonusEnabled: (enabled: boolean) => void;
  setSmartRouting: (enabled: boolean) => void;
  setLiquidationStrategy: (strategy: LiquidationStrategy) => void;
  setNetwork: (network: 'solana-mainnet' | 'solana-devnet') => void;
  updateUserProfile: (profile: Partial<UserPreferences>) => void;
  resetToDefaults: () => void;
}

const INITIAL_TRANSACTIONS: SpendTransaction[] = [
  {
    id: 'tx-1',
    timestamp: Date.now() - 1000 * 60 * 45, // 45 mins ago
    merchantName: 'Apple Store',
    merchantId: 'apple',
    amountUSD: 149.00,
    stockSoldTicker: 'AAPLx',
    stockSoldAmount: 0.816,
    stockSoldPrice: 182.53,
    rewardType: 'same_brand_bonus',
    rewardTicker: 'AAPLx',
    rewardAmount: 0.0122,
    rewardValueUSD: 2.235,
    solanaTxSignature: '5K3uQ9pX8vLmNwR2yZaB4cDeFgHjK1mN3pQrStUvWxYz7aBcDeFgHjK1mN3pQrStUvWxYz',
    jupiterRoute: {
      inToken: 'AAPLx',
      outToken: 'USDC',
      slippage: 0.1,
      priceImpact: 0.02,
    },
  },
  {
    id: 'tx-2',
    timestamp: Date.now() - 1000 * 60 * 60 * 5, // 5 hrs ago
    merchantName: 'Tesla Supercharger',
    merchantId: 'tesla',
    amountUSD: 42.50,
    stockSoldTicker: 'MSFTx',
    stockSoldAmount: 0.181,
    stockSoldPrice: 234.53,
    rewardType: 'brand_stock',
    rewardTicker: 'TSLAx',
    rewardAmount: 0.00194,
    rewardValueUSD: 0.425,
    solanaTxSignature: '4Z2bT8nK9pLmWvRx3yAaB4cDeFgHjK1mN3pQrStUvWxYz7aBcDeFgHjK1mN3pQrStUvWxYx',
    jupiterRoute: {
      inToken: 'MSFTx',
      outToken: 'USDC',
      slippage: 0.1,
      priceImpact: 0.01,
    },
  },
  {
    id: 'tx-3',
    timestamp: Date.now() - 1000 * 60 * 60 * 26, // yesterday
    merchantName: 'Starbucks Coffee',
    merchantId: 'starbucks',
    amountUSD: 14.80,
    stockSoldTicker: 'NVDAx',
    stockSoldAmount: 0.105,
    stockSoldPrice: 140.36,
    rewardType: 'protocol_token',
    rewardTicker: 'xToken',
    rewardAmount: 14.80,
    rewardValueUSD: 0.148,
    solanaTxSignature: '3Y1aR7mJ8oKlVuQw2xZzB4cDeFgHjK1mN3pQrStUvWxYz7aBcDeFgHjK1mN3pQrStUvWxYw',
    jupiterRoute: {
      inToken: 'NVDAx',
      outToken: 'USDC',
      slippage: 0.1,
      priceImpact: 0.01,
    },
  },
];

export const useStockStore = create<StockState>((set, get) => ({
  stocks: INITIAL_STOCKS,
  selectedStockId: 'msft',
  totalPortfolioValue: 209891.21,
  totalInvested: 4389.80,
  
  xTokenPoints: 1845,
  accumulatedStockBackUSD: 248.50,
  
  walletAddress: '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosg4B9',
  solBalance: 14.285,
  usdcBalance: 650.00,
  isWalletConnected: true,
  
  transactions: INITIAL_TRANSACTIONS,
  
  preferences: {
    sameBrandBonusEnabled: true,
    smartRouting: true,
    liquidationStrategy: 'same_brand_first',
    preferredNetwork: 'solana-mainnet',
    userName: 'Jonathan',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  },
  
  isRefreshingPrices: false,
  
  setSelectedStockId: (id: string) => set({ selectedStockId: id }),
  
  setWalletAddress: (address: string) => set({ walletAddress: address, isWalletConnected: true }),
  setSolBalance: (balance: number) => set({ solBalance: balance }),
  setUsdcBalance: (balance: number) => set({ usdcBalance: balance }),

  refreshLivePrices: async () => {
    set({ isRefreshingPrices: true });
    try {
      const liveData = await fetchLiveStockPrices();
      const currentStocks = get().stocks;
      
      let newTotalPortfolioValue = 0;
      const updatedStocks = currentStocks.map((stock) => {
        const live = liveData[stock.tokenTicker] || liveData[stock.ticker];
        if (live && live.price > 0) {
          const newPrice = live.price;
          const newChange24h = live.change24h;
          const newInvestedValue = stock.holdings * newPrice;
          newTotalPortfolioValue += newInvestedValue;
          
          return {
            ...stock,
            price: newPrice,
            change24h: newChange24h,
            investedValue: newInvestedValue,
          };
        }
        newTotalPortfolioValue += stock.holdings * stock.price;
        return stock;
      });

      set({
        stocks: updatedStocks,
        totalPortfolioValue: newTotalPortfolioValue > 0 ? newTotalPortfolioValue : get().totalPortfolioValue,
        isRefreshingPrices: false,
      });
    } catch (err) {
      console.warn('[store] refreshLivePrices failed:', err);
      set({ isRefreshingPrices: false });
    }
  },

  isSyncingBalances: false,

  syncRealBalances: async () => {
    const { walletAddress, preferences } = get();
    if (!walletAddress) return;

    set({ isSyncingBalances: true });
    try {
      const cluster = preferences.preferredNetwork === 'solana-mainnet' ? 'mainnet-beta' : 'devnet';
      const connection = getConnection(cluster);

      // Fetch SOL balance and full xStock portfolio in parallel
      const [sol, portfolio] = await Promise.all([
        fetchSOLBalance(connection, walletAddress),
        fetchFullPortfolio(connection, walletAddress),
      ]);

      const currentStocks = get().stocks;
      let newTotalPortfolioValue = 0;

      const updatedStocks = currentStocks.map((stock) => {
        const liveHolding = portfolio.find(
          (p) => p.ticker === stock.tokenTicker || p.ticker === stock.ticker
        );

        if (liveHolding) {
          const newHoldings = liveHolding.holdings > 0 ? liveHolding.holdings : stock.holdings;
          const newPrice = liveHolding.price > 0 ? liveHolding.price : stock.price;
          const newInvested = newHoldings * newPrice;
          newTotalPortfolioValue += newInvested;

          return {
            ...stock,
            holdings: newHoldings,
            price: newPrice,
            change24h: liveHolding.change24h || stock.change24h,
            investedValue: newInvested,
          };
        }

        newTotalPortfolioValue += stock.holdings * stock.price;
        return stock;
      });

      set({
        solBalance: sol > 0 ? sol : get().solBalance,
        stocks: updatedStocks,
        totalPortfolioValue: newTotalPortfolioValue > 0 ? newTotalPortfolioValue : get().totalPortfolioValue,
        isSyncingBalances: false,
      });
    } catch (err) {
      console.warn('[store] syncRealBalances failed:', err);
      set({ isSyncingBalances: false });
    }
  },
  
  executeSpend: (
    merchantId: string,
    amountUSD: number,
    preferredStockTicker?: string,
    customMerchantName?: string
  ) => {
    const { stocks, preferences, xTokenPoints, accumulatedStockBackUSD, transactions, totalPortfolioValue } = get();
    let merchant = MERCHANTS.find((m) => m.id === merchantId);

    // Support unlisted / custom merchants
    if (!merchant && customMerchantName) {
      merchant = {
        id: 'custom',
        name: customMerchantName,
        category: 'Custom Merchant',
        logo: 'fallback',
        logoColor: '#111827',
        hasXStock: false,
        rewardDescription: '1.0% in protocol xToken Points',
        defaultSpendPresets: [10, 25, 50, 100],
      };
    }

    if (!merchant || amountUSD <= 0) return null;

    const currentMerchant = merchant;
    const targetStockId = currentMerchant.associatedStockId;

    // 1. Determine stock to liquidate
    let sourceStock: Stock | undefined;
    
    if (preferredStockTicker) {
      sourceStock = stocks.find((s) => s.ticker === preferredStockTicker || s.tokenTicker === preferredStockTicker);
    }
    
    if (!sourceStock) {
      if (preferences.liquidationStrategy === 'same_brand_first' && targetStockId) {
        sourceStock = stocks.find((s) => s.ticker === targetStockId);
      }
      
      if (!sourceStock || sourceStock.holdings * sourceStock.price < amountUSD) {
        // Find stock with sufficient balance
        sourceStock = stocks.find((s) => s.holdings * s.price >= amountUSD) || stocks[0];
      }
    }

    if (!sourceStock) return null;

    const sharesToSell = amountUSD / sourceStock.price;
    
    // 2. Calculate Reward
    let rewardType: 'brand_stock' | 'same_brand_bonus' | 'protocol_token' = 'protocol_token';
    let rewardTicker = 'xToken';
    let rewardAmount = 0;
    let rewardValueUSD = 0;
    
    const isSameBrand = targetStockId === sourceStock.ticker;
    
    if (currentMerchant.hasXStock && targetStockId) {
      const brandStock = stocks.find((s) => s.ticker === targetStockId);
      if (brandStock) {
        rewardTicker = brandStock.tokenTicker;
        if (isSameBrand && preferences.sameBrandBonusEnabled) {
          rewardType = 'same_brand_bonus';
          rewardValueUSD = amountUSD * 0.015; // 1.5% bonus!
        } else {
          rewardType = 'brand_stock';
          rewardValueUSD = amountUSD * 0.010; // 1.0% normal
        }
        rewardAmount = rewardValueUSD / brandStock.price;
      }
    } else {
      // Protocol points
      rewardType = 'protocol_token';
      rewardTicker = 'xToken';
      rewardAmount = amountUSD * 1.0;
      rewardValueUSD = amountUSD * 0.01;
    }

    // 3. Update stock holdings
    const updatedStocks = stocks.map((s) => {
      let currentHoldings = s.holdings;
      
      // Deduct sold stock
      if (s.id === sourceStock!.id) {
        currentHoldings = Math.max(0, currentHoldings - sharesToSell);
      }
      
      // Add rewarded stock if applicable
      if (rewardType !== 'protocol_token' && targetStockId === s.ticker) {
        currentHoldings += rewardAmount;
      }
      
      return {
        ...s,
        holdings: currentHoldings,
        investedValue: currentHoldings * s.price,
      };
    });

    // 4. Create transaction receipt
    const tx: SpendTransaction = {
      id: `tx-${Date.now()}`,
      timestamp: Date.now(),
      merchantName: merchant.name,
      merchantId: merchant.id,
      amountUSD,
      stockSoldTicker: sourceStock.tokenTicker,
      stockSoldAmount: sharesToSell,
      stockSoldPrice: sourceStock.price,
      rewardType,
      rewardTicker,
      rewardAmount,
      rewardValueUSD,
      solanaTxSignature: generateSolanaSignature(),
      jupiterRoute: {
        inToken: sourceStock.tokenTicker,
        outToken: 'USDC',
        slippage: 0.1,
        priceImpact: 0.01 + Math.random() * 0.02,
      },
    };

    // 5. Update state
    set({
      stocks: updatedStocks,
      totalPortfolioValue: totalPortfolioValue - amountUSD + rewardValueUSD,
      xTokenPoints: rewardType === 'protocol_token' ? xTokenPoints + Math.round(rewardAmount) : xTokenPoints,
      accumulatedStockBackUSD: accumulatedStockBackUSD + rewardValueUSD,
      transactions: [tx, ...transactions],
    });

    return tx;
  },

  buyStock: (stockId: string, amountUSD: number) => {
    const { stocks, totalPortfolioValue } = get();
    const target = stocks.find((s) => s.id === stockId);
    if (!target || amountUSD <= 0) return false;

    const addedShares = amountUSD / target.price;
    const updatedStocks = stocks.map((s) => {
      if (s.id === stockId) {
        const newHoldings = s.holdings + addedShares;
        return {
          ...s,
          holdings: newHoldings,
          investedValue: newHoldings * s.price,
        };
      }
      return s;
    });

    set({
      stocks: updatedStocks,
      totalPortfolioValue: totalPortfolioValue + amountUSD,
    });
    return true;
  },

  sellStock: (stockId: string, shares: number) => {
    const { stocks, totalPortfolioValue } = get();
    const target = stocks.find((s) => s.id === stockId);
    if (!target || shares <= 0 || target.holdings < shares) return false;

    const sellUSD = shares * target.price;
    const updatedStocks = stocks.map((s) => {
      if (s.id === stockId) {
        const newHoldings = Math.max(0, s.holdings - shares);
        return {
          ...s,
          holdings: newHoldings,
          investedValue: newHoldings * s.price,
        };
      }
      return s;
    });

    set({
      stocks: updatedStocks,
      totalPortfolioValue: totalPortfolioValue - sellUSD,
    });
    return true;
  },

  depositFunds: (amountUSD: number) => {
    set((state) => ({
      totalPortfolioValue: state.totalPortfolioValue + amountUSD,
      totalInvested: state.totalInvested + amountUSD,
    }));
  },

  withdrawFunds: (amountUSD: number) => {
    const { totalPortfolioValue } = get();
    if (amountUSD > totalPortfolioValue) return false;
    set((state) => ({
      totalPortfolioValue: state.totalPortfolioValue - amountUSD,
    }));
    return true;
  },

  setSameBrandBonusEnabled: (enabled: boolean) => {
    set((state) => ({
      preferences: {
        ...state.preferences,
        sameBrandBonusEnabled: enabled,
      },
    }));
  },

  setSmartRouting: (enabled: boolean) => {
    set((state) => ({
      preferences: {
        ...state.preferences,
        smartRouting: enabled,
      },
    }));
  },

  setLiquidationStrategy: (strategy: LiquidationStrategy) => {
    set((state) => ({
      preferences: {
        ...state.preferences,
        liquidationStrategy: strategy,
      },
    }));
  },

  setNetwork: (network: 'solana-mainnet' | 'solana-devnet') => {
    set((state) => ({
      preferences: {
        ...state.preferences,
        preferredNetwork: network,
      },
    }));
  },

  updateUserProfile: (profile: Partial<UserPreferences>) => {
    set((state) => ({
      preferences: {
        ...state.preferences,
        ...profile,
      },
    }));
  },

  resetToDefaults: () => {
    set({
      stocks: INITIAL_STOCKS,
      totalPortfolioValue: 209891.21,
      totalInvested: 4389.80,
      xTokenPoints: 1845,
      accumulatedStockBackUSD: 248.50,
      transactions: INITIAL_TRANSACTIONS,
    });
  },
}));
