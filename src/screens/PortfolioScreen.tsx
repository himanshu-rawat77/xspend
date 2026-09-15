import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Linking,
  ActivityIndicator,
} from 'react-native';
import { Bell, Sparkles, ChevronRight, Zap, ArrowUpRight, ExternalLink, RefreshCw } from 'lucide-react-native';
import { useStockStore } from '../store/useStockStore';
import { Stock } from '../types';
import { RadarWatermark } from '../components/RadarWatermark';
import { StockItemCard } from '../components/StockItemCard';
import { BrandLogo } from '../components/BrandLogo';
import { formatCurrency } from '../utils/formatters';
import { fetchLiveMarketNews, LiveNewsItem } from '../services/news';

interface PortfolioScreenProps {
  onSelectStock: (stock: Stock) => void;
  onOpenSpend: () => void;
  onOpenRewards: () => void;
  onOpenProfile: () => void;
}

export const PortfolioScreen: React.FC<PortfolioScreenProps> = ({
  onSelectStock,
  onOpenSpend,
  onOpenRewards,
  onOpenProfile,
}) => {
  const {
    stocks,
    totalInvested,
    xTokenPoints,
    accumulatedStockBackUSD,
    preferences,
  } = useStockStore();

  const [newsList, setNewsList] = useState<LiveNewsItem[]>([]);
  const [loadingNews, setLoadingNews] = useState(true);

  const loadNews = async () => {
    setLoadingNews(true);
    try {
      const liveItems = await fetchLiveMarketNews(['AAPL', 'MSFT', 'NVDA', 'TSLA', 'AMZN']);
      setNewsList(liveItems);
    } catch (err) {
      console.warn('Failed to load live news:', err);
    } finally {
      setLoadingNews(false);
    }
  };

  useEffect(() => {
    loadNews();
  }, []);

  const handleOpenNewsUrl = (url: string) => {
    if (!url) return;
    Linking.openURL(url).catch((err) =>
      console.warn('Could not open news URL:', err)
    );
  };

  const userStocks = stocks.filter((s) => s.holdings > 0);

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Top Header matching reference: "Helllo, Jonathan!" + Clickable Avatar */}
        <View style={styles.headerRow}>
          <Text style={styles.greetingText}>
            Helllo, {preferences.userName}!
          </Text>
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.iconCircle} activeOpacity={0.7}>
              <Bell size={18} color="#111827" />
            </TouchableOpacity>
            <TouchableOpacity onPress={onOpenProfile} activeOpacity={0.8}>
              <Image
                source={{ uri: preferences.avatarUrl }}
                style={styles.avatar}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* "Your Portfolio" Hero Card matching reference */}
        <View style={styles.portfolioCard}>
          {/* Top Lime Green Header Banner */}
          <View style={styles.portfolioCardHeader}>
            <Text style={styles.portfolioCardTitle}>Your Portfolio</Text>
            <Text style={styles.portfolioCardDate}>December 21, 2022</Text>
          </View>

          {/* Dark Body Section */}
          <View style={styles.portfolioCardBody}>
            {/* Concentric Watermark */}
            <RadarWatermark
              size={170}
              color="rgba(255, 255, 255, 0.08)"
              style={{ right: -30, top: -20 }}
            />

            <View style={styles.investRow}>
              <View>
                <Text style={styles.totalInvestLabel}>Total Invest</Text>
                <Text style={styles.totalInvestAmount}>
                  {formatCurrency(totalInvested)}
                </Text>
              </View>

              {/* % Change Badge */}
              <View style={styles.gainBadge}>
                <Text style={styles.gainBadgeText}>▲ 14.31%</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Dual Metric Cards matching reference */}
        <View style={styles.dualCardsRow}>
          {/* Card 1: Market Direction */}
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Market Direction</Text>
            <Text style={styles.metricValue}>Bearish</Text>
            <Text style={styles.metricChangeRed}>-1.321% last 7 day</Text>
          </View>

          {/* Card 2: Market Momentum */}
          <View style={styles.metricCard}>
            <Text style={styles.metricLabel}>Market Momentum</Text>
            <Text style={styles.metricValue}>Bullish</Text>
            <Text style={styles.metricChangeGreen}>+0.1673 last 7 day</Text>
          </View>
        </View>

        {/* StockBack & Points Quick Hub */}
        <TouchableOpacity
          style={styles.rewardsHubCard}
          onPress={onOpenRewards}
          activeOpacity={0.85}
        >
          <View style={styles.rewardsLeft}>
            <View style={styles.rewardsZap}>
              <Zap size={20} color="#000000" fill="#000000" />
            </View>
            <View style={{ marginLeft: 12 }}>
              <Text style={styles.rewardsHubTitle}>Spend & Earn StockBack</Text>
              <Text style={styles.rewardsHubSub}>
                {xTokenPoints} xToken pts • {formatCurrency(accumulatedStockBackUSD)} StockBack earned
              </Text>
            </View>
          </View>
          <ChevronRight size={18} color="#9CA3AF" />
        </TouchableOpacity>

        {/* Section: Recent Market News with Live Refresh */}
        <View style={styles.sectionHeaderRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={styles.sectionTitle}>Real-time Market News</Text>
            <View style={styles.liveTag}>
              <View style={styles.liveTagDot} />
              <Text style={styles.liveTagText}>LIVE</Text>
            </View>
          </View>
          <TouchableOpacity onPress={loadNews} activeOpacity={0.7} style={styles.refreshBtn}>
            <RefreshCw size={13} color="#6B7280" />
            <Text style={styles.seeMoreText}>Refresh</Text>
          </TouchableOpacity>
        </View>

        {/* Live News Cards */}
        {loadingNews && newsList.length === 0 ? (
          <View style={styles.newsLoadingBox}>
            <ActivityIndicator size="small" color="#111827" />
            <Text style={styles.newsLoadingText}>Loading live market headlines...</Text>
          </View>
        ) : (
          newsList.map((item) => {
            const cleanTicker = item.ticker.replace('x', '').toLowerCase();
            return (
              <TouchableOpacity
                key={item.id}
                style={styles.newsCard}
                activeOpacity={0.8}
                onPress={() => handleOpenNewsUrl(item.url)}
              >
                <View style={styles.newsLeftCol}>
                  <View style={styles.newsTickerRow}>
                    <Text style={styles.newsTicker}>{item.ticker}</Text>
                    <Text style={styles.newsTimeAgo}>• {item.timeAgo}</Text>
                  </View>
                  <Text style={styles.newsHeadline} numberOfLines={2}>
                    {item.title}
                  </Text>
                  <View style={styles.newsFooterRow}>
                    <Text style={styles.newsPublisher}>{item.publisher}</Text>
                    <View style={styles.readMoreRow}>
                      <Text style={styles.readMoreText}>Read article</Text>
                      <ExternalLink size={11} color="#6B7280" style={{ marginLeft: 3 }} />
                    </View>
                  </View>
                </View>
                <View style={styles.newsRightCol}>
                  <BrandLogo name={cleanTicker} size={42} />
                </View>
              </TouchableOpacity>
            );
          })
        )}

        {/* Section: Your Holdings */}
        <View style={[styles.sectionHeaderRow, { marginTop: 24 }]}>
          <Text style={styles.sectionTitle}>Your xStock Holdings</Text>
          <TouchableOpacity onPress={onOpenSpend} activeOpacity={0.7}>
            <Text style={styles.seeMoreText}>Spend Stock</Text>
          </TouchableOpacity>
        </View>

        {userStocks.length === 0 ? (
          <View style={styles.emptyHoldingsCard}>
            <Text style={styles.emptyHoldingsTitle}>No xStocks owned yet</Text>
            <Text style={styles.emptyHoldingsSub}>
              Convert SOL or USDC to tokenized Apple, Nvidia, Tesla or Microsoft shares with Jupiter swap.
            </Text>
          </View>
        ) : (
          userStocks.map((stock) => (
            <StockItemCard key={stock.id} stock={stock} onPress={onSelectStock} />
          ))
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 10,
  },
  greetingText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
    letterSpacing: -0.3,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#C6FF00',
  },
  portfolioCard: {
    borderRadius: 24,
    overflow: 'hidden',
    marginTop: 6,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  portfolioCardHeader: {
    backgroundColor: '#C6FF00',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 12,
  },
  portfolioCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#000000',
  },
  portfolioCardDate: {
    fontSize: 12,
    fontWeight: '600',
    color: '#27272A',
  },
  portfolioCardBody: {
    backgroundColor: '#141416',
    padding: 20,
    position: 'relative',
    overflow: 'hidden',
  },
  investRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  totalInvestLabel: {
    fontSize: 13,
    color: '#9CA3AF',
    fontWeight: '500',
    marginBottom: 4,
  },
  totalInvestAmount: {
    fontSize: 30,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  gainBadge: {
    backgroundColor: '#1F2937',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#374151',
    marginBottom: 4,
  },
  gainBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#C6FF00',
  },
  dualCardsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 16,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: '#F1F3F5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  metricLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
    marginBottom: 6,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 6,
  },
  metricChangeRed: {
    fontSize: 11,
    fontWeight: '700',
    color: '#EF4444',
  },
  metricChangeGreen: {
    fontSize: 11,
    fontWeight: '700',
    color: '#10B981',
  },
  rewardsHubCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#F1F3F5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  rewardsLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rewardsZap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#C6FF00',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rewardsHubTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#111827',
  },
  rewardsHubSub: {
    fontSize: 11.5,
    color: '#6B7280',
    marginTop: 2,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111827',
  },
  seeMoreText: {
    fontSize: 12.5,
    color: '#6B7280',
    fontWeight: '600',
  },
  liveTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 8,
  },
  liveTagDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16A34A',
    marginRight: 4,
  },
  liveTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#15803D',
    letterSpacing: 0.5,
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  newsLoadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
    gap: 8,
  },
  newsLoadingText: {
    fontSize: 12.5,
    color: '#6B7280',
  },
  newsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 14,
    marginVertical: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F3F5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  newsLeftCol: {
    flex: 1,
    paddingRight: 12,
  },
  newsTickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  newsTicker: {
    fontSize: 12,
    fontWeight: '800',
    color: '#111827',
  },
  newsTimeAgo: {
    fontSize: 11,
    color: '#9CA3AF',
    marginLeft: 6,
  },
  newsHeadline: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#374151',
    lineHeight: 17,
    marginBottom: 8,
  },
  newsFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  newsPublisher: {
    fontSize: 11,
    fontWeight: '700',
    color: '#111827',
  },
  readMoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  readMoreText: {
    fontSize: 10.5,
    color: '#6B7280',
    fontWeight: '500',
  },
  newsRightCol: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyHoldingsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F3F5',
    marginVertical: 8,
  },
  emptyHoldingsTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 6,
  },
  emptyHoldingsSub: {
    fontSize: 12.5,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 18,
  },
});
