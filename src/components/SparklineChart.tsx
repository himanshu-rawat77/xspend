import React from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import { generateSmoothPath } from '../utils/formatters';

interface SparklineChartProps {
  data: number[];
  isPositive?: boolean;
  width?: number;
  height?: number;
}

export const SparklineChart: React.FC<SparklineChartProps> = ({
  data,
  isPositive = true,
  width = 75,
  height = 32,
}) => {
  if (!data || data.length < 2) return <View style={{ width, height }} />;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const padding = 4;

  const points = data.map((val, idx) => {
    const x = padding + (idx / (data.length - 1)) * (width - padding * 2);
    const y = height - padding - ((val - min) / range) * (height - padding * 2);
    return { x, y };
  });

  const linePath = generateSmoothPath(points);
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`;

  const strokeColor = isPositive ? '#22C55E' : '#EF4444';
  const gradId = `spark-grad-${isPositive ? 'pos' : 'neg'}-${Math.random().toString(36).substring(2, 7)}`;

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={strokeColor} stopOpacity="0.25" />
            <Stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
          </LinearGradient>
        </Defs>
        <Path d={areaPath} fill={`url(#${gradId})`} />
        <Path
          d={linePath}
          fill="none"
          stroke={strokeColor}
          strokeWidth={1.8}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </Svg>
    </View>
  );
};
