import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';

interface TopStatusBarProps {
  time?: string;
  theme?: 'dark' | 'light';
}

export const TopStatusBar: React.FC<TopStatusBarProps> = ({
  time = '10:35',
  theme = 'dark',
}) => {
  const color = theme === 'dark' ? '#FFFFFF' : '#0F172A';

  return (
    <View style={styles.container}>
      {/* Time */}
      <Text style={[styles.timeText, { color }]}>{time}</Text>

      {/* Dynamic Island / Notch Placeholder */}
      <View style={styles.notchPill} />

      {/* Right Icons: Cellular Signal, Wifi, Battery */}
      <View style={styles.iconsRow}>
        {/* Signal Bars */}
        <Svg width={18} height={12} viewBox="0 0 18 12" style={{ marginRight: 5 }}>
          <Rect x="0" y="9" width="3" height="3" rx="0.7" fill={color} />
          <Rect x="5" y="6" width="3" height="6" rx="0.7" fill={color} />
          <Rect x="10" y="3" width="3" height="9" rx="0.7" fill={color} />
          <Rect x="15" y="0" width="3" height="12" rx="0.7" fill={color} />
        </Svg>

        {/* Wifi */}
        <Svg width={16} height={12} viewBox="0 0 16 12" style={{ marginRight: 5 }}>
          <Path
            d="M8 9.5a1.5 1.5 0 100 3 1.5 1.5 0 000-3zM3.5 6.5C4.7 5.3 6.3 4.5 8 4.5s3.3.8 4.5 2l1.4-1.4C12.3 3.5 10.3 2.5 8 2.5S3.7 3.5 2.1 5.1L3.5 6.5zM0 3C2.2.8 5 0 8 0s5.8.8 8 3l-1.4 1.4C12.9 2.7 10.5 2 8 2s-4.9.7-6.6 2.4L0 3z"
            fill={color}
          />
        </Svg>

        {/* Battery */}
        <Svg width={24} height={12} viewBox="0 0 24 12">
          <Rect x="1" y="1" width="19" height="10" rx="3" stroke={color} strokeWidth="1.2" fill="none" />
          <Rect x="3" y="3" width="13" height="6" rx="1.5" fill={color} />
          <Path d="M21 4.5v3c.8-.3 1.2-.8 1.2-1.5s-.4-1.2-1.2-1.5z" fill={color} />
        </Svg>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 6,
    zIndex: 50,
  },
  timeText: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  notchPill: {
    width: 90,
    height: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    borderRadius: 12,
  },
  iconsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
