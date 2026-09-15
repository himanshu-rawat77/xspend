import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

interface RadarWatermarkProps {
  size?: number;
  color?: string;
  strokeWidth?: number;
  style?: any;
}

export const RadarWatermark: React.FC<RadarWatermarkProps> = ({
  size = 180,
  color = 'rgba(255, 255, 255, 0.08)',
  strokeWidth = 1,
  style,
}) => {
  const center = size / 2;
  const radii = [
    size * 0.15,
    size * 0.28,
    size * 0.42,
    size * 0.58,
    size * 0.74,
  ];

  return (
    <View style={[styles.container, { width: size, height: size }, style]} pointerEvents="none">
      <Svg width={size} height={size}>
        {radii.map((r, index) => (
          <Circle
            key={index}
            cx={center}
            cy={center}
            r={r}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="none"
          />
        ))}
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    right: -30,
    top: -30,
    overflow: 'hidden',
  },
});
