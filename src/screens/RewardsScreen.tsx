import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Zap } from 'lucide-react-native';
import { useStockStore } from '../store/useStockStore';
import { SpendTransaction } from '../types';
import { RadarWatermark } from '../components/RadarWatermark';
import { BrandLogo } from '../components/BrandLogo';
import { formatCurrency, formatNumber } from '../utils/formatters';

interface RewardsScreenProps {
  onSelectTransaction: (tx: SpendTransaction) => void;
  onOpenSpend: () => void;
}

export const RewardsScreen: React.FC<RewardsScreenProps> = ({
  onSelectTransaction,
  onOpenSpend,
}) => {
  const { xTokenPoints, accumulatedStockBackUSD, transactions } = useStockStore();

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Dark Hero Rewards Card */}
        <View style={styles.heroCard}>
          <RadarWatermark size={200} color="rgba(198, 255, 0, 0.08)" style={{ right: -30, top: -20 }} />

          <View style={styles.vaultTag}>
            <Zap size={14} color="#C6FF00" fill="#C6FF00" />
            <Text style={styles.vaultTagText}>StockBack™ Vault</Text>
          </View>

          <Text style={styles.vaultAmount}>
            {formatCurrency(accumulatedStockBackUSD)}
          </Text>
          <Text style={styles.vaultSub}>Total StockBack Earned from Spends</Text>

          <View style={styles.divider} />

          <View style={styles.pointsRow}>
            <View>
              <Text style={styles.pointsLabel}>Protocol xToken Points</Text>
              <Text style={styles.pointsValue}>{xTokenPoints.toLocaleString()} pts</Text>
            </View>
            <TouchableOpacity
              style={styles.spendActionBtn}
              onPress={onOpenSpend}
              activeOpacity={0.8}
            >
              <Text style={styles.spendActionText}>Spend & Earn</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Section: Spend & Reward History */}
        <View style={styles.historySection}>
          <Text style={styles.sectionTitle}>Spend & Reward Activity</Text>

          {transactions.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>No spends recorded yet.</Text>
            </View>
          ) : (
            transactions.map((tx) => {
              const isBonus = tx.rewardType === 'same_brand_bonus';
              const isPoints = tx.rewardType === 'protocol_token';

              return (
                <TouchableOpacity
                  key={tx.id}
                  style={styles.txCard}
                  activeOpacity={0.8}
                  onPress={() => onSelectTransaction(tx)}
                >
                  <View style={styles.txLeft}>
                    <BrandLogo name={tx.merchantId} size={38} />
                    <View style={{ marginLeft: 12 }}>
                      <Text style={styles.merchantName}>{tx.merchantName}</Text>
                      <Text style={styles.txSub}>
                        Sold {formatNumber(tx.stockSoldAmount, 3)} {tx.stockSoldTicker}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.txRight}>
                    <Text style={styles.spentAmount}>
                      -{formatCurrency(tx.amountUSD)}
                    </Text>
                    <View
                      style={[
                        styles.rewardBadge,
                        isBonus ? styles.rewardBadgeBonus : styles.rewardBadgeNormal,
                      ]}
                    >
                      <Text
                        style={[
                          styles.rewardBadgeText,
                          isBonus && { color: '#000000', fontWeight: '800' },
                        ]}
                      >
                        {isPoints
                          ? `+${Math.round(tx.rewardAmount)} pts`
                          : `+${formatNumber(tx.rewardAmount, 4)} ${tx.rewardTicker}`}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>
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
    paddingBottom: 110,
  },
  heroCard: {
    backgroundColor: '#141416',
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 24,
    position: 'relative',
    overflow: 'hidden',
  },
  vaultTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#27272A',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 10,
  },
  vaultTagText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#C6FF00',
    marginLeft: 6,
  },
  vaultAmount: {
    fontSize: 34,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  vaultSub: {
    fontSize: 12.5,
    color: '#9CA3AF',
    marginTop: 2,
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: '#27272A',
    marginVertical: 18,
  },
  pointsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pointsLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  pointsValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 2,
  },
  spendActionBtn: {
    backgroundColor: '#C6FF00',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
  },
  spendActionText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#000000',
  },
  historySection: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 12,
  },
  txCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 6,
    borderWidth: 1,
    borderColor: '#F1F3F5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  txLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  merchantName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  txSub: {
    fontSize: 11.5,
    color: '#6B7280',
    marginTop: 2,
  },
  txRight: {
    alignItems: 'flex-end',
  },
  spentAmount: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
  },
  rewardBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 4,
  },
  rewardBadgeNormal: {
    backgroundColor: '#E8FBF0',
  },
  rewardBadgeBonus: {
    backgroundColor: '#C6FF00',
  },
  rewardBadgeText: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#10B981',
  },
  emptyBox: {
    padding: 24,
    alignItems: 'center',
  },
  emptyText: {
    color: '#9CA3AF',
    fontSize: 13,
  },
});
