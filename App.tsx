import React, { useState, useEffect } from 'react';
import { View, StyleSheet, SafeAreaView, Platform, StatusBar } from 'react-native';
import { AppModeProvider, useAppMode } from './src/contexts/AppModeContext';
import { useStockStore } from './src/store/useStockStore';
import { ActiveTab, Stock, SpendTransaction } from './src/types';
import { HomeScreen } from './src/screens/HomeScreen';
import { PortfolioScreen } from './src/screens/PortfolioScreen';
import { StockDetailScreen } from './src/screens/StockDetailScreen';
import { MarketsScreen } from './src/screens/MarketsScreen';
import { RewardsScreen } from './src/screens/RewardsScreen';
import { HistoryScreen } from './src/screens/HistoryScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { ProfileScreen } from './src/screens/ProfileScreen';
import { BottomTabBar } from './src/components/BottomTabBar';
import { SpendModal } from './src/components/SpendModal';
import { BuyModal } from './src/components/BuyModal';
import { DepositWithdrawModal } from './src/components/DepositWithdrawModal';
import { ReceiptModal } from './src/components/ReceiptModal';

function App() {
  const { stocks, refreshLivePrices } = useStockStore();
  const { isLive } = useAppMode();
  const [activeTab, setActiveTab] = useState<ActiveTab>('summary');
  const [selectedStock, setSelectedStock] = useState<Stock | null>(null);

  // Auto-refresh live stock prices on mount and when in live mode
  useEffect(() => {
    refreshLivePrices();
  }, [isLive]);

  // Modals and Views state
  const [spendModalVisible, setSpendModalVisible] = useState(false);
  const [buyModalVisible, setBuyModalVisible] = useState(false);
  const [depositWithdrawType, setDepositWithdrawType] = useState<'deposit' | 'withdraw' | null>(null);
  const [activeReceiptTx, setActiveReceiptTx] = useState<SpendTransaction | null>(null);
  const [isRewardsView, setIsRewardsView] = useState(false);
  const [isProfileView, setIsProfileView] = useState(false);

  // Stock action handlers
  const handleSelectStock = (stock: Stock) => {
    setSelectedStock(stock);
  };

  const handleBackFromDetail = () => {
    setSelectedStock(null);
  };

  const handleBuyStock = (stock: Stock) => {
    setSelectedStock(stock);
    setBuyModalVisible(true);
  };

  const handleSellStock = (stock: Stock) => {
    setSelectedStock(stock);
    setSpendModalVisible(true);
  };

  const handleSpendSuccess = (tx: SpendTransaction) => {
    setActiveReceiptTx(tx);
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar
        barStyle={
          (activeTab === 'summary' && !selectedStock && !isProfileView) || isRewardsView
            ? 'light-content'
            : 'dark-content'
        }
      />
      <View style={styles.phoneContainer}>
        {/* Main Content Area */}
        <View style={styles.screenWrapper}>
          {selectedStock ? (
            <StockDetailScreen
              stock={selectedStock}
              onBack={handleBackFromDetail}
              onBuy={handleBuyStock}
              onSell={handleSellStock}
            />
          ) : isProfileView ? (
            <ProfileScreen
              onBack={() => setIsProfileView(false)}
              onOpenSettings={() => {
                setIsProfileView(false);
                setActiveTab('settings');
              }}
              onOpenRewards={() => {
                setIsProfileView(false);
                setIsRewardsView(true);
              }}
            />
          ) : isRewardsView ? (
            <RewardsScreen
              onSelectTransaction={(tx) => setActiveReceiptTx(tx)}
              onOpenSpend={() => setSpendModalVisible(true)}
            />
          ) : activeTab === 'summary' ? (
            <HomeScreen
              onSelectStock={handleSelectStock}
              onOpenSpend={() => setSpendModalVisible(true)}
              onOpenBuy={handleBuyStock}
              onOpenRewards={() => setIsRewardsView(true)}
              onNavigateToHistory={() => setActiveTab('history')}
            />
          ) : activeTab === 'markets' ? (
            <MarketsScreen
              onSelectStock={handleSelectStock}
              onOpenSpend={() => setSpendModalVisible(true)}
            />
          ) : activeTab === 'portfolio' ? (
            <PortfolioScreen
              onSelectStock={handleSelectStock}
              onOpenSpend={() => setSpendModalVisible(true)}
              onOpenRewards={() => setIsRewardsView(true)}
              onOpenProfile={() => setIsProfileView(true)}
            />
          ) : activeTab === 'history' ? (
            <HistoryScreen
              onSelectTransaction={(tx) => setActiveReceiptTx(tx)}
              onOpenSpend={() => setSpendModalVisible(true)}
            />
          ) : (
            <SettingsScreen />
          )}
        </View>

        {/* Bottom Tab Bar (hidden when viewing stock detail or profile) */}
        {!selectedStock && !isProfileView && (
          <BottomTabBar
            activeTab={activeTab}
            onTabChange={(tab) => {
              setIsRewardsView(false);
              setIsProfileView(false);
              setActiveTab(tab);
            }}
            onSpendPress={() => setSpendModalVisible(true)}
          />
        )}

        {/* Spend-from-Stocks Modal */}
        <SpendModal
          visible={spendModalVisible}
          onClose={() => setSpendModalVisible(false)}
          onSuccess={handleSpendSuccess}
          initialStockTicker={selectedStock?.ticker}
        />

        {/* Buy Stock Modal */}
        <BuyModal
          visible={buyModalVisible}
          stock={selectedStock || stocks[0]}
          onClose={() => setBuyModalVisible(false)}
        />

        {/* Deposit / Withdraw Modal */}
        {depositWithdrawType && (
          <DepositWithdrawModal
            visible={!!depositWithdrawType}
            type={depositWithdrawType}
            onClose={() => setDepositWithdrawType(null)}
          />
        )}

        {/* Transaction Success Receipt Modal */}
        <ReceiptModal
          visible={!!activeReceiptTx}
          transaction={activeReceiptTx}
          onClose={() => setActiveReceiptTx(null)}
        />
      </View>
    </SafeAreaView>
  );
}

function AppWithProviders() {
  return (
    <AppModeProvider>
      <App />
    </AppModeProvider>
  );
}

export { AppWithProviders as default };

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  phoneContainer: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    maxWidth: Platform.OS === 'web' ? 440 : undefined,
    width: '100%',
    alignSelf: 'center',
    overflow: 'hidden',
    position: 'relative',
    borderWidth: Platform.OS === 'web' ? 1 : 0,
    borderColor: '#334155',
    borderRadius: Platform.OS === 'web' ? 24 : 0,
    marginVertical: Platform.OS === 'web' ? 16 : 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 25,
  },
  screenWrapper: {
    flex: 1,
  },
});
