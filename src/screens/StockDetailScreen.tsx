import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import {
  ArrowLeft,
  Star,
  ArrowDownLeft,
  ArrowUpRight,
  Zap,
  ShieldCheck,
  Building2,
  TrendingUp,
  TrendingDown,
} from 'lucide-react-native';
import { Stock, Timeframe } from '../types';
import { RadarWatermark } from '../components/RadarWatermark';
import { InteractiveStockChart } from '../components/InteractiveStockChart';
import { formatCurrency, formatNumber } from '../utils/formatters';
import { XSTOCK_REGISTRY } from '../services/xstocks';

interface StockDetailScreenProps {
  stock: Stock;
  onBack: () => void;
  onBuy: (stock: Stock) => void;
  onSell: (stock: Stock) => void;
}

export const StockDetailScreen: React.FC<StockDetailScreenProps> = ({
  stock,
  onBack,
  onBuy,
  onSell,
}) => {
  const [selectedTimeframe, setSelectedTimeframe] = useState<Timeframe>('1M');
  const [isFavorite, setIsFavorite] = useState(false);

  const timeframes: Timeframe[] = ['1D', '5D', '1W', '1M', '3M', '6M'];
  const chartPoints = stock.historicalData[selectedTimeframe] || stock.historicalData['1M'];

  // Match Backed token info
  const backedInfo = XSTOCK_REGISTRY.find(
    (x) => x.ticker === stock.tokenTicker || x.stockSymbol === stock.ticker
  );

  const isPositive = stock.change24h >= 0;
  const changeUSD = (stock.price * stock.change24h) / 100;

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Top Navigation Bar */}
        <View style={styles.navBar}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={onBack}
            activeOpacity={0.7}
          >
            <ArrowLeft size={20} color="#111827" />
          </TouchableOpacity>

          <View style={styles.titleCol}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={styles.navTicker}>{stock.ticker}</Text>
              <View style={styles.backedBadge}>
                <Text style={styles.backedBadgeText}>{backedInfo?.backedSymbol || stock.tokenTicker}</Text>
              </View>
            </View>
            <Text style={styles.navName}>{stock.name}</Text>
          </View>

          <TouchableOpacity
            style={styles.favoriteBtn}
            onPress={() => setIsFavorite(!isFavorite)}
            activeOpacity={0.7}
          >
            <Star
              size={20}
              color={isFavorite ? '#F59E0B' : '#6B7280'}
              fill={isFavorite ? '#F59E0B' : 'none'}
            />
          </TouchableOpacity>
        </View>

        {/* ─── Hero Card: Real Price First + Stats Grid ───────────── */}
        <View style={styles.priceHeroCard}>
          <RadarWatermark
            size={180}
            color="rgba(255, 255, 255, 0.08)"
            style={{ right: -25, top: -25 }}
          />

          {/* Top Price Row */}
          <View style={styles.priceMainRow}>
            <View>
              <Text style={styles.priceLabel}>Real-Time Market Price</Text>
              <Text style={styles.priceAmount}>{formatCurrency(stock.price)}</Text>
            </View>

            <View style={[styles.pnlPill, isPositive ? styles.pnlPillPositive : styles.pnlPillNegative]}>
              {isPositive ? (
                <TrendingUp size={14} color="#141416" style={{ marginRight: 4 }} />
              ) : (
                <TrendingDown size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
              )}
              <Text style={[styles.pnlPillText, isPositive ? { color: '#141416' } : { color: '#FFFFFF' }]}>
                {isPositive ? '+' : ''}
                {formatCurrency(changeUSD)} ({Math.abs(stock.change24h).toFixed(2)}%)
              </Text>
            </View>
          </View>

          {/* Key Metrics Grid: Market Cap, 24h Volume, Day Range, Reserve Ratio */}
          <View style={styles.metricsGrid}>
            <View style={styles.metricGridItem}>
              <Text style={styles.metricGridLabel}>Market Cap</Text>
              <Text style={styles.metricGridVal}>{stock.marketCap || '$3.48T'}</Text>
            </View>

            <View style={styles.metricGridItem}>
              <Text style={styles.metricGridLabel}>24h Volume</Text>
              <Text style={styles.metricGridVal}>{stock.volume24h || '$48.2M'}</Text>
            </View>

            <View style={styles.metricGridItem}>
              <Text style={styles.metricGridLabel}>Day Range</Text>
              <Text style={styles.metricGridVal}>
                ${(stock.price * 0.99).toFixed(2)} - ${(stock.price * 1.01).toFixed(2)}
              </Text>
            </View>

            <View style={styles.metricGridItem}>
              <Text style={styles.metricGridLabel}>Collateral</Text>
              <Text style={styles.metricGridValLime}>1:1 Backed</Text>
            </View>
          </View>
        </View>

        {/* Timeframe Filter Pills */}
        <View style={styles.timeframeRow}>
          {timeframes.map((tf) => {
            const isActive = selectedTimeframe === tf;
            return (
              <TouchableOpacity
                key={tf}
                style={[styles.tfPill, isActive && styles.tfPillActive]}
                onPress={() => setSelectedTimeframe(tf)}
                activeOpacity={0.75}
              >
                <Text style={[styles.tfText, isActive && styles.tfTextActive]}>
                  {tf}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Interactive Chart Card */}
        <View style={styles.chartWrapper}>
          <InteractiveStockChart
            data={chartPoints}
            width={Dimensions.get('window').width - 40}
            height={260}
            lineColor={isPositive ? '#10B981' : '#EF4444'}
          />
        </View>

        {/* User Holdings & Spend Benefit Card */}
        <View style={styles.holdingsCard}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>Your Tokenized Position</Text>
            <View style={styles.solBadge}>
              <Text style={styles.solBadgeText}>{stock.tokenTicker} on Solana</Text>
            </View>
          </View>

          <View style={styles.holdingsGrid}>
            <View style={styles.holdingsCol}>
              <Text style={styles.holdingsLabel}>Shares Held</Text>
              <Text style={styles.holdingsVal}>{formatNumber(stock.holdings, 3)} shares</Text>
            </View>
            <View style={styles.holdingsCol}>
              <Text style={styles.holdingsLabel}>Total Value</Text>
              <Text style={styles.holdingsVal}>{formatCurrency(stock.investedValue)}</Text>
            </View>
          </View>

          {/* Same Brand Spend Booster Notice */}
          <View style={styles.bonusNoticeBox}>
            <Zap size={16} color="#141416" fill="#141416" style={{ marginRight: 6 }} />
            <Text style={styles.bonusNoticeText}>
              Earn +1.5% Same-Brand StockBack when spending at {stock.name.split(' ')[0]}
            </Text>
          </View>
        </View>

        {/* Backed Finance Custody & Proof of Reserve */}
        <View style={styles.custodyCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
            <ShieldCheck size={16} color="#16A34A" style={{ marginRight: 6 }} />
            <Text style={styles.custodyTitle}>100% Backed Proof-of-Reserve</Text>
          </View>
          <Text style={styles.custodyBody}>
            Fully collateralized 1:1 with real equity shares custodied by Maerki Baumann & Co. AG (Switzerland). Regulated under the Swiss DLT Act.
          </Text>
        </View>
      </ScrollView>

      {/* Bottom Action Bar */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={styles.spendActionBtn}
          onPress={() => onSell(stock)}
          activeOpacity={0.85}
        >
          <Zap size={18} color="#141416" fill="#141416" style={{ marginRight: 6 }} />
          <Text style={styles.spendActionBtnText}>Spend from Stock</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.buyBtn}
          onPress={() => onBuy(stock)}
          activeOpacity={0.85}
        >
          <Text style={styles.buyBtnText}>Buy / Swap</Text>
          <ArrowDownLeft size={18} color="#FFFFFF" strokeWidth={2.5} style={{ marginLeft: 6 }} />
        </TouchableOpacity>
      </View>
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
    paddingBottom: 120,
  },
  navBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  titleCol: {
    flex: 1,
    alignItems: 'center',
  },
  navTicker: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111827',
  },
  backedBadge: {
    backgroundColor: 'rgba(198, 255, 0, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 6,
  },
  backedBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#65A30D',
  },
  navName: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 1,
  },
  favoriteBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  // ─── Price Hero Card ──────────────────────────────────────────────────────
  priceHeroCard: {
    backgroundColor: '#141416',
    borderRadius: 24,
    padding: 18,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
    marginBottom: 12,
  },
  priceMainRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  priceLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  priceAmount: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 2,
  },
  pnlPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  pnlPillPositive: {
    backgroundColor: '#C6FF00',
  },
  pnlPillNegative: {
    backgroundColor: '#EF4444',
  },
  pnlPillText: {
    fontSize: 12,
    fontWeight: '800',
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: '#1F1F23',
    borderRadius: 16,
    padding: 12,
  },
  metricGridItem: {
    width: '50%',
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  metricGridLabel: {
    fontSize: 10.5,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  metricGridVal: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 2,
  },
  metricGridValLime: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#C6FF00',
    marginTop: 2,
  },

  // ─── Timeframe Filter Pills ───────────────────────────────────────────────
  timeframeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 10,
  },
  tfPill: {
    flex: 1,
    paddingVertical: 7,
    alignItems: 'center',
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    marginHorizontal: 3,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  tfPillActive: {
    backgroundColor: '#111827',
    borderColor: '#111827',
  },
  tfText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
  },
  tfTextActive: {
    color: '#FFFFFF',
  },

  // ─── Chart Card ───────────────────────────────────────────────────────────
  chartWrapper: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F1F3F5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
    marginBottom: 12,
  },

  // ─── Holdings & Rewards Card ──────────────────────────────────────────────
  holdingsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#F1F3F5',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#111827',
  },
  solBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  solBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4B5563',
  },
  holdingsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
  },
  holdingsCol: {
    flex: 1,
  },
  holdingsLabel: {
    fontSize: 11,
    color: '#6B7280',
  },
  holdingsVal: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#111827',
    marginTop: 2,
  },
  bonusNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#C6FF00',
    borderRadius: 12,
    padding: 10,
  },
  bonusNoticeText: {
    fontSize: 11.5,
    fontWeight: '800',
    color: '#141416',
    flex: 1,
  },

  // ─── Custody & Reserve ────────────────────────────────────────────────────
  custodyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 10,
  },
  custodyTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#111827',
  },
  custodyBody: {
    fontSize: 11.5,
    color: '#6B7280',
    lineHeight: 16,
  },

  // ─── Bottom Actions ───────────────────────────────────────────────────────
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 28,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 8,
  },
  spendActionBtn: {
    flex: 1.2,
    flexDirection: 'row',
    backgroundColor: '#C6FF00',
    borderRadius: 16,
    paddingVertical: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  spendActionBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#141416',
  },
  buyBtn: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#111827',
    borderRadius: 16,
    paddingVertical: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  buyBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
});
