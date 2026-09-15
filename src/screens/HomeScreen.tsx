import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import {
  Search,
  ChevronDown,
  ArrowDownLeft,
  ArrowUpRight,
  Repeat,
  Zap,
  Gift,
  QrCode,
  Sparkles,
  TrendingUp,
  History,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react-native';
import { useStockStore } from '../store/useStockStore';
import { Stock, SpendTransaction } from '../types';
import { RadarWatermark } from '../components/RadarWatermark';
import { StockItemCard } from '../components/StockItemCard';
import { BrandLogo } from '../components/BrandLogo';
import { formatCurrency, formatNumber, shortenAddress } from '../utils/formatters';

interface HomeScreenProps {
  onSelectStock: (stock: Stock) => void;
  onOpenSpend: () => void;
  onOpenBuy: (stock: Stock) => void;
  onOpenRewards: () => void;
  onNavigateToHistory: () => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onSelectStock,
  onOpenSpend,
  onOpenBuy,
  onOpenRewards,
  onNavigateToHistory,
}) => {
  const { stocks, totalPortfolioValue, transactions, accumulatedStockBackUSD, xTokenPoints } = useStockStore();
  const [searchQuery, setSearchQuery] = useState('');

  const filteredStocks = stocks.filter(
    (s) =>
      s.ticker.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.shortName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const recentTransactions = transactions.slice(0, 2);

  // Active 1.5% bonus brand stocks
  const boostedBrands = [
    { name: 'Apple Store', stock: 'AAPLx', rate: '1.5%', logo: 'apple' },
    { name: 'Tesla Motors', stock: 'TSLAx', rate: '1.5%', logo: 'tesla' },
    { name: 'Microsoft 365', stock: 'MSFTx', rate: '1.5%', logo: 'microsoft' },
    { name: 'Amazon Prime', stock: 'AMZNx', rate: '1.5%', logo: 'amazon' },
  ];

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ─── Dark Hero Card ────────────────────────────────────── */}
        <View style={styles.darkHeroCard}>
          <RadarWatermark size={200} color="rgba(255, 255, 255, 0.07)" style={{ right: -40, top: -20 }} />

          {/* Balance Section */}
          <View style={styles.balanceSection}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={styles.balanceSubtitle}>Spendable Stock Portfolio</Text>
              <View style={styles.gainBadge}>
                <TrendingUp size={12} color="#141416" style={{ marginRight: 3 }} />
                <Text style={styles.gainBadgeText}>+2.45% Today</Text>
              </View>
            </View>
            <Text style={styles.balanceAmount}>
              {formatCurrency(totalPortfolioValue)}
            </Text>
          </View>

          {/* Streamlined Primary Action Bar */}
          <View style={styles.actionPillContainer}>
            {/* Primary Action 1: Scan & Spend (Prominent Lime) */}
            <TouchableOpacity
              style={styles.actionPillLime}
              onPress={onOpenSpend}
              activeOpacity={0.85}
            >
              <View style={styles.actionIconCircleLime}>
                <Zap size={16} color="#000000" fill="#000000" />
              </View>
              <Text style={styles.actionPillTextLime}>Scan & Pay</Text>
            </TouchableOpacity>

            {/* Primary Action 2: Rewards Vault */}
            <TouchableOpacity
              style={styles.actionPillDark}
              onPress={onOpenRewards}
              activeOpacity={0.85}
            >
              <View style={styles.actionIconCircleDark}>
                <Gift size={15} color="#C6FF00" strokeWidth={2.2} />
              </View>
              <Text style={styles.actionPillTextDark}>StockBack™ Rewards</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ─── Active 1.5% Same-Brand Multiplier Widget ──────────── */}
        <View style={styles.boosterWidget}>
          <View style={styles.boosterHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Zap size={15} color="#141416" fill="#141416" style={{ marginRight: 5 }} />
              <Text style={styles.boosterHeading}>1.5% Same-Brand Multipliers Active</Text>
            </View>
            <TouchableOpacity onPress={onOpenRewards} activeOpacity={0.7}>
              <Text style={styles.boosterVaultLink}>Vault ➔</Text>
            </TouchableOpacity>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.boosterPillsRow}>
            {boostedBrands.map((b, idx) => (
              <View key={idx} style={styles.brandBoostPill}>
                <BrandLogo name={b.logo} size={20} />
                <Text style={styles.brandBoostName}>{b.name.split(' ')[0]}</Text>
                <View style={styles.brandBoostBadge}>
                  <Text style={styles.brandBoostBadgeText}>+{b.rate}</Text>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* ─── Search Bar ────────────────────────────────────────── */}
        <View style={styles.searchBarContainer}>
          <Search size={18} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search Backed xStocks (AAPLx, TSLAx)..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* ─── My Spendable Tokenized Holdings ─────────────────────── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>My Tokenized Stocks</Text>
          <Text style={styles.sectionSubtitle}>{stocks.length} Backed assets on Solana</Text>
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

        {/* ─── Recent Spends & Activity Preview ────────────────────── */}
        {recentTransactions.length > 0 && (
          <View style={styles.recentActivitySection}>
            <View style={styles.recentHeaderRow}>
              <Text style={styles.recentTitle}>Recent Activity</Text>
              <TouchableOpacity onPress={onNavigateToHistory} activeOpacity={0.7} style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={styles.viewAllText}>View All</Text>
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
                    Liquidated {formatNumber(tx.stockSoldAmount, 3)} {tx.stockSoldTicker}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.recentTxAmount}>-{formatCurrency(tx.amountUSD)}</Text>
                  <View style={styles.recentRewardTag}>
                    <Text style={styles.recentRewardText}>+{formatCurrency(tx.rewardValueUSD)} back</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 110,
  },

  // ─── Hero Card ────────────────────────────────────────────────────────────
  darkHeroCard: {
    backgroundColor: '#141416',
    borderRadius: 26,
    padding: 22,
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
    marginBottom: 18,
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
  },
  actionPillLime: {
    flex: 1.1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#C6FF00',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 16,
    marginRight: 6,
  },
  actionIconCircleLime: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  actionPillTextLime: {
    color: '#141416',
    fontWeight: '800',
    fontSize: 13,
  },
  actionPillDark: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#27272A',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 16,
    marginLeft: 6,
  },
  actionIconCircleDark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#3F3F46',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  actionPillTextDark: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12.5,
  },

  // ─── Booster Widget ───────────────────────────────────────────────────────
  boosterWidget: {
    backgroundColor: '#C6FF00',
    borderRadius: 20,
    padding: 14,
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
  viewAllText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
    marginRight: 2,
  },
  recentTxCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
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
    color: '#9CA3AF',
    marginTop: 1,
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
});
