import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { Search } from 'lucide-react-native';
import { useStockStore } from '../store/useStockStore';
import { Stock } from '../types';
import { StockItemCard } from '../components/StockItemCard';

interface MarketsScreenProps {
  onSelectStock: (stock: Stock) => void;
  onOpenSpend: () => void;
}

export const MarketsScreen: React.FC<MarketsScreenProps> = ({
  onSelectStock,
  onOpenSpend,
}) => {
  const { stocks } = useStockStore();
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All xStocks');

  const categories = ['All xStocks', 'Top Gainers', 'Mega Cap', 'Tech'];

  const filtered = stocks.filter((s) => {
    const matchesQuery =
      s.name.toLowerCase().includes(query.toLowerCase()) ||
      s.ticker.toLowerCase().includes(query.toLowerCase());
    if (!matchesQuery) return false;

    if (selectedCategory === 'Top Gainers') return s.change24h > 2.0;
    if (selectedCategory === 'Tech') return ['MSFT', 'NVDA', 'AAPL', 'GOOGL', 'META'].includes(s.ticker);
    return true;
  });

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Solana Stock Markets</Text>
          <Text style={styles.headerSub}>Tokenized US equities on Solana (xStocks)</Text>
        </View>

        {/* Search */}
        <View style={styles.searchBar}>
          <Search size={18} color="#9CA3AF" style={{ marginRight: 10 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search stock by ticker or name..."
            placeholderTextColor="#9CA3AF"
            value={query}
            onChangeText={setQuery}
          />
        </View>

        {/* Categories */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
          {categories.map((cat) => {
            const isActive = selectedCategory === cat;
            return (
              <TouchableOpacity
                key={cat}
                style={[styles.catPill, isActive && styles.catPillActive]}
                onPress={() => setSelectedCategory(cat)}
                activeOpacity={0.75}
              >
                <Text style={[styles.catText, isActive && styles.catTextActive]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Stock List */}
        <View style={styles.list}>
          {filtered.map((stock) => (
            <StockItemCard key={stock.id} stock={stock} onPress={onSelectStock} />
          ))}
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
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 110,
  },
  header: {
    marginBottom: 14,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
  },
  headerSub: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#111827',
  },
  catScroll: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  catPill: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  catPillActive: {
    backgroundColor: '#111827',
    borderColor: '#111827',
  },
  catText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#6B7280',
  },
  catTextActive: {
    color: '#FFFFFF',
  },
  list: {
    marginTop: 4,
  },
});
