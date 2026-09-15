import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Linking,
} from 'react-native';
import {
  History,
  Search,
  Filter,
  ExternalLink,
  Zap,
  CheckCircle2,
  Copy,
  Check,
  TrendingDown,
  Gift,
  ArrowUpRight,
  ShieldCheck,
} from 'lucide-react-native';
import { useStockStore } from '../store/useStockStore';
import { SpendTransaction } from '../types';
import { BrandLogo } from '../components/BrandLogo';
import { formatCurrency, formatNumber, shortenAddress } from '../utils/formatters';

interface HistoryScreenProps {
  onSelectTransaction: (tx: SpendTransaction) => void;
  onOpenSpend: () => void;
}

type FilterType = 'all' | 'spends' | 'rewards' | 'same_brand';

export const HistoryScreen: React.FC<HistoryScreenProps> = ({
  onSelectTransaction,
  onOpenSpend,
}) => {
  const { transactions, accumulatedStockBackUSD, xTokenPoints } = useStockStore();
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Total volume spent
  const totalVolumeSpent = transactions.reduce((sum, tx) => sum + tx.amountUSD, 0);

  const handleCopy = (sig: string, id: string) => {
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleOpenSolscan = (signature: string) => {
    const url = `https://solscan.io/tx/${signature}`;
    Linking.openURL(url).catch(() => {});
  };

  const filteredTransactions = transactions.filter((tx) => {
    const matchesSearch =
      tx.merchantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.stockSoldTicker.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.rewardTicker.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (filterType === 'rewards') return tx.rewardValueUSD > 0;
    if (filterType === 'same_brand') return tx.rewardType === 'same_brand_bonus';
    if (filterType === 'spends') return tx.amountUSD > 0;
    return true;
  });

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Activity & Spends</Text>
          <Text style={styles.subtitle}>On-chain Solana liquidations & StockBack ledger</Text>
        </View>

        {/* Top Summary Metrics Banner */}
        <View style={styles.metricsHeroCard}>
          <View style={styles.metricCol}>
            <Text style={styles.metricLabel}>Total Spent</Text>
            <Text style={styles.metricVal}>{formatCurrency(totalVolumeSpent)}</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricCol}>
            <Text style={styles.metricLabel}>StockBack Earned</Text>
            <Text style={styles.metricValLime}>{formatCurrency(accumulatedStockBackUSD)}</Text>
          </View>
          <View style={styles.metricDivider} />
          <View style={styles.metricCol}>
            <Text style={styles.metricLabel}>xToken Points</Text>
            <Text style={styles.metricVal}>{xTokenPoints.toLocaleString()}</Text>
          </View>
        </View>

        {/* Search Bar */}
        <View style={styles.searchBar}>
          <Search size={18} color="#9CA3AF" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search merchant, stock ticker..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Filter Pills */}
        <View style={styles.filterPillsRow}>
          <TouchableOpacity
            style={[styles.filterPill, filterType === 'all' && styles.filterPillActive]}
            onPress={() => setFilterType('all')}
            activeOpacity={0.8}
          >
            <Text style={[styles.filterPillText, filterType === 'all' && styles.filterPillTextActive]}>
              All ({transactions.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterPill, filterType === 'same_brand' && styles.filterPillActiveLime]}
            onPress={() => setFilterType('same_brand')}
            activeOpacity={0.8}
          >
            <Zap size={13} color={filterType === 'same_brand' ? '#141416' : '#C6FF00'} style={{ marginRight: 4 }} />
            <Text style={[styles.filterPillText, filterType === 'same_brand' && styles.filterPillTextActiveLime]}>
              1.5% Same-Brand
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.filterPill, filterType === 'rewards' && styles.filterPillActive]}
            onPress={() => setFilterType('rewards')}
            activeOpacity={0.8}
          >
            <Gift size={13} color={filterType === 'rewards' ? '#FFFFFF' : '#6B7280'} style={{ marginRight: 4 }} />
            <Text style={[styles.filterPillText, filterType === 'rewards' && styles.filterPillTextActive]}>
              StockBack
            </Text>
          </TouchableOpacity>
        </View>

        {/* Transaction History List */}
        <Text style={styles.sectionHeading}>Recent Transactions</Text>
        
        {filteredTransactions.length === 0 ? (
          <View style={styles.emptyCard}>
            <History size={36} color="#9CA3AF" style={{ marginBottom: 8 }} />
            <Text style={styles.emptyTitle}>No Transactions Found</Text>
            <Text style={styles.emptySubtitle}>Spend from your tokenized stocks to earn automatic StockBack.</Text>
            <TouchableOpacity style={styles.emptySpendBtn} onPress={onOpenSpend} activeOpacity={0.85}>
              <Text style={styles.emptySpendBtnText}>⚡ Spend from Stocks Now</Text>
            </TouchableOpacity>
          </View>
        ) : (
          filteredTransactions.map((tx) => {
            const isSameBrand = tx.rewardType === 'same_brand_bonus';
            const isPoints = tx.rewardType === 'protocol_token';
            const dateStr = new Date(tx.timestamp).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <TouchableOpacity
                key={tx.id}
                style={styles.txCard}
                onPress={() => onSelectTransaction(tx)}
                activeOpacity={0.8}
              >
                {/* Top Row: Merchant Logo + Name + Amount */}
                <View style={styles.txTopRow}>
                  <View style={styles.txMerchantInfo}>
                    <BrandLogo name={tx.merchantId} size={34} />
                    <View style={{ marginLeft: 10 }}>
                      <Text style={styles.txMerchantName}>{tx.merchantName}</Text>
                      <Text style={styles.txDate}>{dateStr}</Text>
                    </View>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.txAmount}>-{formatCurrency(tx.amountUSD)}</Text>
                    <Text style={styles.txStockSold}>
                      {formatNumber(tx.stockSoldAmount, 3)} {tx.stockSoldTicker}
                    </Text>
                  </View>
                </View>

                {/* Middle Row: Reward Badge */}
                <View style={[styles.rewardBadgeRow, isSameBrand ? styles.rewardBadgeSameBrand : styles.rewardBadgeNormal]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    <Zap
                      size={14}
                      color={isSameBrand ? '#141416' : '#16A34A'}
                      fill={isSameBrand ? '#141416' : '#16A34A'}
                      style={{ marginRight: 5 }}
                    />
                    <Text style={[styles.rewardBadgeTitle, isSameBrand && { color: '#141416' }]}>
                      {isSameBrand
                        ? `1.5% Same-Brand Bonus (+${formatNumber(tx.rewardAmount, 4)} ${tx.rewardTicker})`
                        : isPoints
                        ? `+${Math.round(tx.rewardAmount)} xToken Points Earned`
                        : `1.0% StockBack (+${formatNumber(tx.rewardAmount, 4)} ${tx.rewardTicker})`}
                    </Text>
                  </View>
                  <Text style={[styles.rewardBadgeValue, isSameBrand && { color: '#141416' }]}>
                    +{formatCurrency(tx.rewardValueUSD)}
                  </Text>
                </View>

                {/* Bottom Row: On-Chain Finalized & Solscan Link */}
                <View style={styles.txBottomRow}>
                  <View style={styles.finalizedPill}>
                    <CheckCircle2 size={12} color="#16A34A" style={{ marginRight: 4 }} />
                    <Text style={styles.finalizedText}>Finalized on Solana</Text>
                  </View>

                  <TouchableOpacity
                    style={styles.solscanBtn}
                    onPress={() => handleOpenSolscan(tx.solanaTxSignature)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.solscanBtnText}>
                      {shortenAddress(tx.solanaTxSignature, 4)}
                    </Text>
                    <ExternalLink size={12} color="#2563EB" style={{ marginLeft: 4 }} />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            );
          })
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
    paddingTop: 16,
    paddingBottom: 110,
  },
  header: {
    marginBottom: 14,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
  },
  subtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },

  // ─── Metrics Hero Card ────────────────────────────────────────────────────
  metricsHeroCard: {
    backgroundColor: '#141416',
    borderRadius: 22,
    paddingVertical: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  metricCol: {
    flex: 1,
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 10.5,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  metricVal: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 3,
  },
  metricValLime: {
    fontSize: 14,
    fontWeight: '800',
    color: '#C6FF00',
    marginTop: 3,
  },
  metricDivider: {
    width: 1,
    height: 26,
    backgroundColor: '#27272A',
  },

  // ─── Search Bar ───────────────────────────────────────────────────────────
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 13.5,
    color: '#111827',
    marginLeft: 8,
    padding: 0,
  },

  // ─── Filter Pills ─────────────────────────────────────────────────────────
  filterPillsRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  filterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingVertical: 7,
    paddingHorizontal: 12,
    marginRight: 8,
  },
  filterPillActive: {
    backgroundColor: '#111827',
    borderColor: '#111827',
  },
  filterPillActiveLime: {
    backgroundColor: '#C6FF00',
    borderColor: '#C6FF00',
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
  },
  filterPillTextActive: {
    color: '#FFFFFF',
  },
  filterPillTextActiveLime: {
    color: '#141416',
    fontWeight: '800',
  },

  sectionHeading: {
    fontSize: 14,
    fontWeight: '800',
    color: '#374151',
    marginBottom: 10,
  },

  // ─── Transaction Cards ────────────────────────────────────────────────────
  txCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F1F3F5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  txTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  txMerchantInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  txMerchantName: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#111827',
  },
  txDate: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 1,
  },
  txAmount: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
  },
  txStockSold: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 1,
  },
  rewardBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  rewardBadgeNormal: {
    backgroundColor: '#F0FDF4',
  },
  rewardBadgeSameBrand: {
    backgroundColor: '#C6FF00',
  },
  rewardBadgeTitle: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#15803D',
  },
  rewardBadgeValue: {
    fontSize: 12,
    fontWeight: '800',
    color: '#15803D',
  },
  txBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  finalizedPill: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  finalizedText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#15803D',
  },
  solscanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  solscanBtnText: {
    fontSize: 11,
    fontFamily: 'monospace',
    fontWeight: '700',
    color: '#2563EB',
  },

  // ─── Empty State ──────────────────────────────────────────────────────────
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 28,
    alignItems: 'center',
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
  },
  emptySubtitle: {
    fontSize: 12.5,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
    lineHeight: 18,
  },
  emptySpendBtn: {
    backgroundColor: '#C6FF00',
    borderRadius: 14,
    paddingVertical: 11,
    paddingHorizontal: 20,
  },
  emptySpendBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#141416',
  },
});
