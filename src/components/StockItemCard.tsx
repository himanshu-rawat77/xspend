import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Stock } from '../types';
import { BrandLogo } from './BrandLogo';
import { SparklineChart } from './SparklineChart';
import { formatCurrency, formatPercent } from '../utils/formatters';

interface StockItemCardProps {
  stock: Stock;
  onPress: (stock: Stock) => void;
}

export const StockItemCard: React.FC<StockItemCardProps> = ({ stock, onPress }) => {
  const isPositive = stock.change24h >= 0;

  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.75}
      onPress={() => onPress(stock)}
    >
      {/* Left: Brand Logo & Ticker/Name */}
      <View style={styles.leftSection}>
        <BrandLogo name={stock.logo || stock.ticker} size={42} />
        <View style={styles.infoCol}>
          <Text style={styles.tickerText}>{stock.ticker}</Text>
          <Text style={styles.nameText} numberOfLines={1}>
            {stock.shortName || stock.name}
          </Text>
        </View>
      </View>

      {/* Center: Sparkline Mini Wave */}
      <View style={styles.chartSection}>
        <SparklineChart
          data={stock.sparkline}
          isPositive={isPositive}
          width={65}
          height={30}
        />
      </View>

      {/* Right: Price & % Change Badge */}
      <View style={styles.rightSection}>
        <Text style={styles.priceText}>{formatCurrency(stock.price)}</Text>
        <View
          style={[
            styles.badge,
            isPositive ? styles.positiveBadge : styles.negativeBadge,
          ]}
        >
          <Text
            style={[
              styles.badgeText,
              isPositive ? styles.positiveText : styles.negativeText,
            ]}
          >
            {isPositive ? '▲ ' : '▼ '}
            {formatPercent(Math.abs(stock.change24h))}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F1F3F5',
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1.2,
  },
  infoCol: {
    marginLeft: 12,
  },
  tickerText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.2,
  },
  nameText: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
    marginTop: 2,
  },
  chartSection: {
    flex: 0.9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rightSection: {
    flex: 1.1,
    alignItems: 'flex-end',
  },
  priceText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.3,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 3,
  },
  positiveBadge: {
    backgroundColor: '#E8FBF0',
  },
  negativeBadge: {
    backgroundColor: '#FEE2E2',
  },
  badgeText: {
    fontSize: 10.5,
    fontWeight: '700',
  },
  positiveText: {
    color: '#10B981',
  },
  negativeText: {
    color: '#EF4444',
  },
});
