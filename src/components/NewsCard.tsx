import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MarketNews } from '../types';
import { BrandLogo } from './BrandLogo';

interface NewsCardProps {
  news: MarketNews;
  onPress?: () => void;
}

export const NewsCard: React.FC<NewsCardProps> = ({ news, onPress }) => {
  return (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.8}
      onPress={onPress}
    >
      <View style={styles.leftCol}>
        <Text style={styles.ticker}>{news.ticker}</Text>
        <Text style={styles.headline} numberOfLines={3}>
          {news.headline}
        </Text>
        <View style={styles.footerRow}>
          <Text style={styles.dateText}>{news.date}</Text>
          <Text style={styles.sourceText}>{news.source}</Text>
        </View>
      </View>
      <View style={styles.rightCol}>
        <BrandLogo name={news.logo} size={48} />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 16,
    marginVertical: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F3F5',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  leftCol: {
    flex: 1,
    paddingRight: 14,
  },
  ticker: {
    fontSize: 13,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 4,
  },
  headline: {
    fontSize: 12.5,
    color: '#6B7280',
    lineHeight: 18,
    fontWeight: '400',
    marginBottom: 10,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateText: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  sourceText: {
    fontSize: 11,
    color: '#111827',
    fontWeight: '700',
  },
  rightCol: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
