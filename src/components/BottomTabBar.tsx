import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LayoutGrid, TrendingUp, PieChart, History, Zap } from 'lucide-react-native';
import { ActiveTab } from '../types';

interface BottomTabBarProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  onSpendPress: () => void;
}

export const BottomTabBar: React.FC<BottomTabBarProps> = ({
  activeTab,
  onTabChange,
  onSpendPress,
}) => {
  return (
    <View style={styles.wrapper}>
      <View style={styles.bar}>
        {/* Tab 1: Summary */}
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => onTabChange('summary')}
          activeOpacity={0.7}
        >
          <LayoutGrid
            size={22}
            color={activeTab === 'summary' ? '#111827' : '#9CA3AF'}
            strokeWidth={activeTab === 'summary' ? 2.5 : 1.8}
          />
          <Text
            style={[
              styles.tabLabel,
              activeTab === 'summary' && styles.activeTabLabel,
            ]}
          >
            Summary
          </Text>
        </TouchableOpacity>

        {/* Tab 2: Markets */}
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => onTabChange('markets')}
          activeOpacity={0.7}
        >
          <TrendingUp
            size={22}
            color={activeTab === 'markets' ? '#111827' : '#9CA3AF'}
            strokeWidth={activeTab === 'markets' ? 2.5 : 1.8}
          />
          <Text
            style={[
              styles.tabLabel,
              activeTab === 'markets' && styles.activeTabLabel,
            ]}
          >
            Markets
          </Text>
        </TouchableOpacity>

        {/* Center Floating Spend/Transfer Badge */}
        <TouchableOpacity
          style={styles.centerButton}
          activeOpacity={0.85}
          onPress={onSpendPress}
        >
          <View style={styles.centerInner}>
            <Zap size={18} color="#C6FF00" strokeWidth={2.8} />
          </View>
        </TouchableOpacity>

        {/* Tab 3: Portfolio */}
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => onTabChange('portfolio')}
          activeOpacity={0.7}
        >
          <PieChart
            size={22}
            color={activeTab === 'portfolio' ? '#111827' : '#9CA3AF'}
            strokeWidth={activeTab === 'portfolio' ? 2.5 : 1.8}
          />
          <Text
            style={[
              styles.tabLabel,
              activeTab === 'portfolio' && styles.activeTabLabel,
            ]}
          >
            Portfolio
          </Text>
        </TouchableOpacity>

        {/* Tab 4: History */}
        <TouchableOpacity
          style={styles.tabItem}
          onPress={() => onTabChange('history')}
          activeOpacity={0.7}
        >
          <History
            size={22}
            color={activeTab === 'history' ? '#111827' : '#9CA3AF'}
            strokeWidth={activeTab === 'history' ? 2.5 : 1.8}
          />
          <Text
            style={[
              styles.tabLabel,
              activeTab === 'history' && styles.activeTabLabel,
            ]}
          >
            History
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingBottom: 20,
    paddingTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 8,
  },
  bar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    minWidth: 60,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#9CA3AF',
    marginTop: 4,
  },
  activeTabLabel: {
    color: '#111827',
    fontWeight: '700',
  },
  centerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#141416',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  centerInner: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1E1E22',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
