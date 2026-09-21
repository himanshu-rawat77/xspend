import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Modal,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import {
  Search,
  Zap,
  Gift,
  TrendingUp,
  ChevronRight,
  ChevronDown,
  User,
  PlusCircle,
  ExternalLink,
  ShieldCheck,
  Smartphone,
  Wallet,
  Check,
  Sparkles,
  Droplets,
} from 'lucide-react-native';
import { useStockStore } from '../store/useStockStore';
import { useAppMode, AppMode } from '../contexts/AppModeContext';
import { Stock, SpendTransaction } from '../types';
import { RadarWatermark } from '../components/RadarWatermark';
import { StockItemCard } from '../components/StockItemCard';
import { BrandLogo } from '../components/BrandLogo';
import { formatCurrency, formatNumber, shortenAddress } from '../utils/formatters';
import { claimDevnetTestPackage } from '../services/faucet';
import { getConnection } from '../services/wallet';
import { DevnetFaucetModal } from '../components/DevnetFaucetModal';
import { ProfileAvatarButton } from '../components/ProfileAvatarButton';

interface HomeScreenProps {
  onSelectStock: (stock: Stock) => void;
  onOpenSpend: () => void;
  onOpenBuy: (stock: Stock) => void;
  onOpenRewards: () => void;
  onNavigateToHistory: () => void;
  onOpenProfile?: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onSelectStock,
  onOpenSpend,
  onOpenBuy,
  onOpenRewards,
  onNavigateToHistory,
  onOpenProfile,
}) => {
  const {
    stocks,
    totalPortfolioValue,
    transactions,
    preferences,
    walletAddress,
    solBalance,
    setNetwork,
    syncRealBalances,
    resetToDefaults,
  } = useStockStore();
  const { appMode, isLive, isDemo, setAppMode } = useAppMode();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'etf' | 'tech' | 'finance'>('all');
  const [showNetworkModal, setShowNetworkModal] = useState(false);
  const [showFaucetModal, setShowFaucetModal] = useState(false);
  const [isClaimingFaucet, setIsClaimingFaucet] = useState(false);
  const [faucetNotice, setFaucetNotice] = useState<string | null>(null);

  const isDevnet = preferences.preferredNetwork === 'solana-devnet';

  const handleClaimFaucet = async () => {
    if (isClaimingFaucet) return;
    setIsClaimingFaucet(true);
    setFaucetNotice(null);
    try {
      const conn = getConnection('devnet');
      const targetWallet = walletAddress || '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosg4B9';
      const result = await claimDevnetTestPackage(conn, targetWallet);
      if (walletAddress) {
        await syncRealBalances();
      }
      if (result.success && !result.error) {
        setFaucetNotice(
          `On-chain: ${result.solAirdropped} SOL` +
            (result.tokensClaimed[0] ? ` + ${result.tokensClaimed[0].amount} ${result.tokensClaimed[0].ticker}` : '')
        );
      } else {
        setFaucetNotice(result.error || 'Faucet did not mint tokens. Run npm run setup:devnet.');
      }
      setTimeout(() => setFaucetNotice(null), 4000);
    } catch (e: any) {
      setFaucetNotice(e?.message || 'Airdrop failed. Did not credit fake token balances.');
      setTimeout(() => setFaucetNotice(null), 4000);
    } finally {
      setIsClaimingFaucet(false);
    }
  };

  // Filter stocks by search and category
  const filteredStocks = stocks.filter((s) => {
    const matchesSearch =
      s.ticker.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.shortName.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (selectedCategory === 'etf') {
      return ['SPY', 'QQQ', 'VOO', 'SGOV', 'ARKK', 'VTI'].includes(s.ticker);
    }
    if (selectedCategory === 'tech') {
      return ['NVDA', 'AAPL', 'MSFT', 'TSLA', 'AMZN', 'GOOGL', 'META'].includes(s.ticker);
    }
    if (selectedCategory === 'finance') {
      return ['COIN', 'JPM', 'GS', 'VISA', 'BRKB', 'MSTR'].includes(s.ticker);
    }
    return true;
  });

  const recentTransactions = transactions.slice(0, 3);

  // Active 1.5% bonus brand stocks
  const boostedBrands = [
    { name: 'Apple Store', stock: 'AAPLx', rate: '1.5%', logo: 'apple' },
    { name: 'Tesla Motors', stock: 'TSLAx', rate: '1.5%', logo: 'tesla' },
    { name: 'Microsoft 365', stock: 'MSFTx', rate: '1.5%', logo: 'microsoft' },
    { name: 'Amazon Prime', stock: 'AMZNx', rate: '1.5%', logo: 'amazon' },
    { name: 'Starbucks', stock: 'SBUXx', rate: '1.5%', logo: 'sbux' },
  ];

  const handleSelectNetwork = async (mode: 'demo' | 'devnet' | 'mainnet') => {
    if (mode === 'demo') {
      await setAppMode('demo');
      resetToDefaults();
    } else if (mode === 'devnet') {
      setNetwork('solana-devnet');
      await setAppMode('live');
      if (walletAddress) await syncRealBalances({ address: walletAddress, cluster: 'devnet' });
    } else if (mode === 'mainnet') {
      setNetwork('solana-mainnet');
      await setAppMode('live');
      if (walletAddress) await syncRealBalances({ address: walletAddress, cluster: 'mainnet-beta' });
    }
    setShowNetworkModal(false);
  };

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ─── 1. Clean Top Header with Live Network Status Pill ─────── */}
        <View style={styles.topHeaderBar}>
          <View style={styles.brandRow}>
            <View style={styles.brandBadge}>
              <Zap size={16} color="#C6FF00" fill="#C6FF00" />
            </View>
            <Text style={styles.brandTitle}>xSpend</Text>
          </View>

          {/* Interactive Network & Mode Selector Pill */}
          <TouchableOpacity
            style={[
              styles.networkPill,
              isDemo
                ? styles.networkPillDemo
                : isDevnet
                ? styles.networkPillDevnet
                : styles.networkPillMainnet,
            ]}
            onPress={() => setShowNetworkModal(true)}
            activeOpacity={0.8}
          >
            <View
              style={[
                styles.networkDot,
                { backgroundColor: isDemo ? '#F59E0B' : isDevnet ? '#8B5CF6' : '#10B981' },
              ]}
            />
            <Text
              style={[
                styles.networkPillText,
                { color: isDemo ? '#B45309' : isDevnet ? '#6D28D9' : '#047857' },
              ]}
            >
              {isDemo ? '🟡 Demo Sandbox' : isDevnet ? '🟣 Solana Devnet' : '🟢 Solana Mainnet'}
            </Text>
            <ChevronDown
              size={12}
              color={isDemo ? '#B45309' : isDevnet ? '#6D28D9' : '#047857'}
              style={{ marginLeft: 3 }}
            />
          </TouchableOpacity>

          {/* Profile Shortcut */}
          {onOpenProfile && (
            <ProfileAvatarButton
              onPress={onOpenProfile}
              size={36}
            />
          )}
        </View>

        {/* ─── 2. Dark Hero Card: Spendable Portfolio ───────────────── */}
        <View style={styles.darkHeroCard}>
          <RadarWatermark size={200} color="rgba(255, 255, 255, 0.07)" style={{ right: -40, top: -20 }} />

          {/* Balance Section */}
          <View style={styles.balanceSection}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={styles.balanceSubtitle}>
                {isLive ? 'Live On-Chain Portfolio' : 'Spendable Stock Portfolio'}
              </Text>
              <View style={styles.gainBadge}>
                <TrendingUp size={12} color="#141416" style={{ marginRight: 3 }} />
                <Text style={styles.gainBadgeText}>+2.45% Today</Text>
              </View>
            </View>

            <Text style={styles.balanceAmount}>
              {formatCurrency(totalPortfolioValue)}
            </Text>

            {/* Wallet Address & SOL Balance Pill */}
            <View style={styles.walletMetaRow}>
              <View style={styles.walletAddressBox}>
                <Wallet size={11} color="#9CA3AF" style={{ marginRight: 4 }} />
                <Text style={styles.walletAddressText}>
                  {walletAddress ? shortenAddress(walletAddress, 5) : 'Wallet Not Connected'}
                </Text>
              </View>

              {isLive && (
                <View style={styles.solBalancePill}>
                  <Text style={styles.solBalanceText}>
                    {formatNumber(solBalance, 3)} SOL
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* 3 Streamlined Primary Action Buttons */}
          <View style={styles.actionPillContainer}>
            {/* Action 1: Scan & Spend */}
            <TouchableOpacity
              style={styles.actionPillLime}
              onPress={onOpenSpend}
              activeOpacity={0.85}
            >
              <View style={styles.actionIconCircleLime}>
                <Zap size={15} color="#000000" fill="#000000" />
              </View>
              <Text style={styles.actionPillTextLime}>⚡ Scan & Pay</Text>
            </TouchableOpacity>

            

            {/* Action 3: Rewards Vault */}
            <TouchableOpacity
              style={styles.actionPillDark}
              onPress={onOpenRewards}
              activeOpacity={0.85}
            >
              <View style={styles.actionIconCircleDark}>
                <Gift size={14} color="#C6FF00" strokeWidth={2.2} />
              </View>
              <Text style={styles.actionPillTextDark}>StockBack™</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ─── Devnet Judge Testing Faucet Widget ──────────── */}
        {isDevnet && isLive && (
          <TouchableOpacity
            style={styles.faucetCard}
            onPress={() => setShowFaucetModal(true)}
            activeOpacity={0.9}
          >
            <View style={styles.faucetHeaderRow}>
              <View style={styles.faucetIconCircle}>
                <Droplets size={16} color="#7C3AED" />
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={styles.faucetTitle}>Devnet Testing Faucet</Text>
                  <View style={styles.freeBadge}>
                    <Text style={styles.freeBadgeText}>100% FREE</Text>
                  </View>
                </View>
                <Text style={styles.faucetDesc}>
                  Tap to claim 1.0 SOL + test AAPLx, TSLAx & USDC for on-chain testing
                </Text>
              </View>
              <TouchableOpacity
                style={styles.faucetClaimBtn}
                onPress={() => setShowFaucetModal(true)}
                activeOpacity={0.8}
              >
                <Text style={styles.faucetClaimBtnText}>💧 Open Faucet</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        )}

        {/* ─── 3. Active 1.5% Same-Brand Multiplier Widget ──────────── */}
        <View style={styles.boosterWidget}>
          <View style={styles.boosterHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Sparkles size={14} color="#141416" style={{ marginRight: 5 }} />
              <Text style={styles.boosterHeading}>1.5% Same-Brand Equity Boosters</Text>
            </View>
            <TouchableOpacity onPress={onOpenRewards} activeOpacity={0.7}>
              <Text style={styles.boosterVaultLink}>View All ➔</Text>
            </TouchableOpacity>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.boosterPillsRow}>
            {boostedBrands.map((b, idx) => (
              <View key={idx} style={styles.brandBoostPill}>
                <BrandLogo name={b.logo} size={18} />
                <Text style={styles.brandBoostName}>{b.name.split(' ')[0]}</Text>
                <View style={styles.brandBoostBadge}>
                  <Text style={styles.brandBoostBadgeText}>+{b.rate}</Text>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* ─── 4. Search & Category Filter Bar ──────────────────────── */}
        <View style={styles.searchBarContainer}>
          <Search size={16} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search 24+ tokenized stocks (NVDA, AAPL)..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Category Filter Chips */}
        <View style={styles.categoryChipsRow}>
          {[
            { id: 'all', label: `All (${stocks.length})` },
            { id: 'tech', label: 'Tech Giants' },
            { id: 'etf', label: 'ETFs & Indexes' },
            { id: 'finance', label: 'Finance & Crypto' },
          ].map((cat) => (
            <TouchableOpacity
              key={cat.id}
              style={[
                styles.categoryChip,
                selectedCategory === cat.id && styles.categoryChipActive,
              ]}
              onPress={() => setSelectedCategory(cat.id as any)}
              activeOpacity={0.75}
            >
              <Text
                style={[
                  styles.categoryChipText,
                  selectedCategory === cat.id && styles.categoryChipTextActive,
                ]}
              >
                {cat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ─── 5. My Spendable Tokenized Holdings ─────────────────────── */}
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.sectionTitle}>Tokenized Equities</Text>
            <Text style={styles.sectionSubtitle}>
              1:1 Backed Finance SPL tokens • Solana Token-2022
            </Text>
          </View>
          <TouchableOpacity onPress={() => onSelectStock(stocks[0])} activeOpacity={0.7}>
            <Text style={styles.viewChartLink}>Charts & Trade ➔</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.stockList}>
          {filteredStocks.map((stock) => (
            <StockItemCard
              key={stock.id}
              stock={stock}
              onPress={() => onSelectStock(stock)}
            />
          ))}
        </View>

        {/* ─── 6. Recent Spends & Activity Preview ────────────────────── */}
        {recentTransactions.length > 0 && (
          <View style={styles.recentActivitySection}>
            <View style={styles.recentHeaderRow}>
              <View>
                <Text style={styles.recentTitle}>Recent On-Chain Activity</Text>
                <Text style={styles.recentSub}>Instant Solana settlement logs</Text>
              </View>
              <TouchableOpacity onPress={onNavigateToHistory} activeOpacity={0.7} style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={styles.viewAllText}>Full History</Text>
                <ChevronRight size={14} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {recentTransactions.map((tx) => (
              <TouchableOpacity
                key={tx.id}
                style={styles.recentTxCard}
                onPress={onNavigateToHistory}
                activeOpacity={0.8}
              >
                <BrandLogo name={tx.merchantId} size={28} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.recentTxMerchant}>{tx.merchantName}</Text>
                  <Text style={styles.recentTxSub}>
                    {tx.merchantName.includes('Buy')
                      ? `Purchased ${formatNumber(tx.rewardAmount || 0, 3)} ${tx.rewardTicker}`
                      : `Liquidated ${formatNumber(tx.stockSoldAmount, 3)} ${tx.stockSoldTicker}`}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[styles.recentTxAmount, tx.merchantName.includes('Buy') && { color: '#16A34A' }]}>
                    {tx.merchantName.includes('Buy') ? `+${formatCurrency(tx.amountUSD)}` : `-${formatCurrency(tx.amountUSD)}`}
                  </Text>
                  <View style={styles.recentRewardTag}>
                    <Text style={styles.recentRewardText}>
                      {tx.merchantName.includes('Buy') ? 'Swap Settled' : `+${formatCurrency(tx.rewardValueUSD)} back`}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {/* ─── Quick Network & App Mode Modal ──────────────────────────── */}
      <Modal
        visible={showNetworkModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowNetworkModal(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setShowNetworkModal(false)}>
          <Pressable style={styles.networkSheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Select Network & Mode</Text>
              <TouchableOpacity style={styles.closeBtn} onPress={() => setShowNetworkModal(false)}>
                <User size={0} />
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#6B7280' }}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.sheetSub}>
              Switch between Solana networks or try the simulated Demo mode.
            </Text>

            {/* Option 1: Solana Devnet */}
            <TouchableOpacity
              style={[styles.networkOption, isLive && isDevnet && styles.networkOptionActive]}
              onPress={() => handleSelectNetwork('devnet')}
              activeOpacity={0.85}
            >
              <View style={[styles.networkOptionDot, { backgroundColor: '#8B5CF6' }]} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={styles.networkOptionTitle}>Solana Devnet</Text>
                  <View style={styles.recommendedBadge}>
                    <Text style={styles.recommendedBadgeText}>RECOMMENDED FOR DEMO</Text>
                  </View>
                </View>
                <Text style={styles.networkOptionDesc}>
                  Real on-chain signing & transactions with zero financial risk.
                </Text>
              </View>
              {isLive && isDevnet && <Check size={18} color="#8B5CF6" />}
            </TouchableOpacity>

            {/* Option 2: Solana Mainnet */}
            <TouchableOpacity
              style={[styles.networkOption, isLive && !isDevnet && styles.networkOptionActive]}
              onPress={() => handleSelectNetwork('mainnet')}
              activeOpacity={0.85}
            >
              <View style={[styles.networkOptionDot, { backgroundColor: '#10B981' }]} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.networkOptionTitle}>Solana Mainnet-Beta</Text>
                <Text style={styles.networkOptionDesc}>
                  Live Jupiter DEX swaps & real Backed token liquidation.
                </Text>
              </View>
              {isLive && !isDevnet && <Check size={18} color="#10B981" />}
            </TouchableOpacity>

            {/* Option 3: Demo Sandbox */}
            <TouchableOpacity
              style={[styles.networkOption, isDemo && styles.networkOptionActive]}
              onPress={() => handleSelectNetwork('demo')}
              activeOpacity={0.85}
            >
              <View style={[styles.networkOptionDot, { backgroundColor: '#F59E0B' }]} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.networkOptionTitle}>Demo Sandbox</Text>
                <Text style={styles.networkOptionDesc}>
                  Simulated preloaded portfolio without connecting a wallet.
                </Text>
              </View>
              {isDemo && <Check size={18} color="#F59E0B" />}
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Devnet Testing Faucet Modal */}
      <DevnetFaucetModal
        visible={showFaucetModal}
        onClose={() => setShowFaucetModal(false)}
        onStartSpend={onOpenSpend}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 8,
    paddingBottom: 110,
  },

  // ─── Top Header Bar ───────────────────────────────────────────────────────
  topHeaderBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 2,
    paddingTop: 4,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandBadge: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: '#141416',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    shadowColor: '#C6FF00',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  brandTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: '#111827',
    letterSpacing: -0.5,
  },
  networkPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  networkPillDemo: {
    backgroundColor: '#FEF3C7',
    borderColor: '#FDE68A',
  },
  networkPillDevnet: {
    backgroundColor: '#EDE9FE',
    borderColor: '#DDD6FE',
  },
  networkPillMainnet: {
    backgroundColor: '#D1FAE5',
    borderColor: '#A7F3D0',
  },
  networkDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    marginRight: 5,
  },
  networkPillText: {
    fontSize: 11.5,
    fontWeight: '800',
  },
  profileBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ─── Hero Card ────────────────────────────────────────────────────────────
  darkHeroCard: {
    backgroundColor: '#141416',
    borderRadius: 26,
    padding: 20,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
    marginBottom: 12,
  },
  balanceSection: {
    marginBottom: 16,
  },
  balanceSubtitle: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  balanceAmount: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 4,
    letterSpacing: -0.5,
  },
  walletMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 8,
  },
  walletAddressBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  walletAddressText: {
    fontSize: 10.5,
    color: '#D1D5DB',
    fontWeight: '600',
    fontFamily: 'monospace',
  },
  solBalancePill: {
    backgroundColor: 'rgba(20, 241, 149, 0.15)',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },
  solBalanceText: {
    fontSize: 10.5,
    color: '#14F195',
    fontWeight: '800',
  },
  gainBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#C6FF00',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  gainBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#141416',
  },

  // ─── Primary Action Bar ───────────────────────────────────────────────────
  actionPillContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 6,
  },
  actionPillLime: {
    flex: 1.1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#C6FF00',
    paddingVertical: 11,
    paddingHorizontal: 8,
    borderRadius: 14,
  },
  actionIconCircleLime: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 5,
  },
  actionPillTextLime: {
    color: '#141416',
    fontWeight: '800',
    fontSize: 12,
  },
  actionPillBuy: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2563EB',
    paddingVertical: 11,
    paddingHorizontal: 8,
    borderRadius: 14,
  },
  actionIconCircleBuy: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 5,
  },
  actionPillTextBuy: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
  },
  actionPillDark: {
    flex: 0.95,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#27272A',
    paddingVertical: 11,
    paddingHorizontal: 8,
    borderRadius: 14,
  },
  actionIconCircleDark: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#3F3F46',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 5,
  },
  actionPillTextDark: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 11.5,
  },

  // ─── Booster Widget ───────────────────────────────────────────────────────
  boosterWidget: {
    backgroundColor: '#C6FF00',
    borderRadius: 20,
    padding: 13,
    marginBottom: 12,
  },
  boosterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  boosterHeading: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#141416',
  },
  boosterVaultLink: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#141416',
  },
  boosterPillsRow: {
    flexDirection: 'row',
  },
  brandBoostPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginRight: 8,
  },
  brandBoostName: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111827',
    marginLeft: 6,
  },
  brandBoostBadge: {
    backgroundColor: 'rgba(198, 255, 0, 0.4)',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 6,
  },
  brandBoostBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#141416',
  },

  // ─── Search Bar ───────────────────────────────────────────────────────────
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#111827',
    marginLeft: 8,
    padding: 0,
  },

  // ─── Holdings Section ─────────────────────────────────────────────────────
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
  },
  sectionSubtitle: {
    fontSize: 11.5,
    color: '#6B7280',
    fontWeight: '500',
  },
  viewChartLink: {
    fontSize: 12,
    fontWeight: '800',
    color: '#2563EB',
  },
  stockList: {
    marginBottom: 14,
  },

  // ─── Recent Spends Preview ────────────────────────────────────────────────
  recentActivitySection: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F3F5',
    marginBottom: 20,
  },
  recentHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  recentTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
  },
  recentSub: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 1,
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
    marginRight: 2,
  },
  recentTxCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  recentTxMerchant: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#111827',
  },
  recentTxSub: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 1,
  },
  txSigText: {
    fontSize: 10,
    color: '#9CA3AF',
    fontFamily: 'monospace',
    marginTop: 2,
  },
  recentTxAmount: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
  },
  recentRewardTag: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 2,
  },
  recentRewardText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#16A34A',
  },

  // ─── Category Chips ───────────────────────────────────────────────────────
  categoryChipsRow: {
    flexDirection: 'row',
    marginBottom: 14,
    gap: 6,
  },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  categoryChipActive: {
    backgroundColor: '#111827',
    borderColor: '#111827',
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
  },
  categoryChipTextActive: {
    color: '#FFFFFF',
  },

  // ─── Network Modal Sheet ──────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  networkSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 36,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  sheetSub: {
    fontSize: 12.5,
    color: '#6B7280',
    marginBottom: 16,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  networkOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 16,
    backgroundColor: '#F9FAFB',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    marginBottom: 10,
  },
  networkOptionActive: {
    borderColor: '#111827',
    backgroundColor: '#F3F4F6',
  },
  networkOptionDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  networkOptionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
  },
  networkOptionDesc: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 2,
  },
  recommendedBadge: {
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 6,
  },
  recommendedBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#7C3AED',
  },
  faucetCard: {
    backgroundColor: '#FAF5FF',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#DDD6FE',
    marginBottom: 16,
  },
  faucetHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  faucetIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#EDE9FE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  faucetTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#5B21B6',
  },
  freeBadge: {
    backgroundColor: '#7C3AED',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 6,
  },
  freeBadgeText: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  faucetDesc: {
    fontSize: 11,
    color: '#6D28D9',
    marginTop: 2,
    lineHeight: 15,
  },
  faucetClaimBtn: {
    backgroundColor: '#7C3AED',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  faucetClaimBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  faucetNoticeBox: {
    marginTop: 10,
    padding: 8,
    backgroundColor: '#EDE9FE',
    borderRadius: 10,
  },
  faucetNoticeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#5B21B6',
    textAlign: 'center',
  },
});

