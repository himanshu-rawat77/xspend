import React, { useState } from 'react';
import { View, Text, StyleSheet, Dimensions, PanResponder, GestureResponderEvent } from 'react-native';
import Svg, { Path, Defs, LinearGradient, Stop, Line, Circle } from 'react-native-svg';
import { ChartPoint } from '../types';
import { generateSmoothPath, formatCurrency } from '../utils/formatters';

interface InteractiveStockChartProps {
  data: ChartPoint[];
  width?: number;
  height?: number;
  lineColor?: string;
}

export const InteractiveStockChart: React.FC<InteractiveStockChartProps> = ({
  data,
  width = Dimensions.get('window').width - 48,
  height = 240,
  lineColor = '#10B981',
}) => {
  const chartWidth = width - 44; // leave space for right Y-axis labels
  const chartHeight = height - 34; // leave space for bottom X-axis labels
  const paddingLeft = 10;
  const paddingRight = 10;
  const paddingTop = 20;
  const paddingBottom = 20;

  if (!data || data.length === 0) {
    return <View style={{ width, height, justifyContent: 'center', alignItems: 'center' }} />;
  }

  const [activeIndex, setActiveIndex] = useState<number>(data.length - 1);

  const prices = data.map((d) => d.price);
  const minPrice = Math.floor(Math.min(...prices) * 0.92);
  const maxPrice = Math.ceil(Math.max(...prices) * 1.08);
  const priceRange = maxPrice - minPrice || 1;

  // Convert points to pixel coordinates
  const points = data.map((d, i) => {
    const x = paddingLeft + (i / (data.length - 1)) * (chartWidth - paddingLeft - paddingRight);
    const y = paddingTop + (1 - (d.price - minPrice) / priceRange) * (chartHeight - paddingTop - paddingBottom);
    return { x, y };
  });

  const linePath = generateSmoothPath(points);
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${chartHeight} L ${points[0].x} ${chartHeight} Z`;

  const activePoint = points[activeIndex] || points[points.length - 1];
  const activeData = data[activeIndex] || data[data.length - 1];

  // Y-axis grid values (5 divisions)
  const yLabels = [
    maxPrice,
    Math.round(minPrice + priceRange * 0.75),
    Math.round(minPrice + priceRange * 0.5),
    Math.round(minPrice + priceRange * 0.25),
    minPrice,
  ];

  const handleTouch = (evt: GestureResponderEvent) => {
    const locationX = evt.nativeEvent.locationX;
    const boundedX = Math.max(paddingLeft, Math.min(chartWidth - paddingRight, locationX));
    const ratio = (boundedX - paddingLeft) / (chartWidth - paddingLeft - paddingRight);
    const index = Math.round(ratio * (data.length - 1));
    if (index >= 0 && index < data.length) {
      setActiveIndex(index);
    }
  };

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: handleTouch,
    onPanResponderMove: handleTouch,
  });

  return (
    <View style={[styles.container, { width, height }]}>
      {/* Chart Canvas Area */}
      <View style={{ width: chartWidth, height: chartHeight }} {...panResponder.panHandlers}>
        <Svg width={chartWidth} height={chartHeight}>
          <Defs>
            <LinearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={lineColor} stopOpacity="0.28" />
              <Stop offset="80%" stopColor={lineColor} stopOpacity="0.04" />
              <Stop offset="100%" stopColor={lineColor} stopOpacity="0.0" />
            </LinearGradient>
          </Defs>

          {/* Horizontal Grid lines */}
          {yLabels.map((val, idx) => {
            const y = paddingTop + (idx / (yLabels.length - 1)) * (chartHeight - paddingTop - paddingBottom);
            return (
              <Line
                key={idx}
                x1={paddingLeft}
                y1={y}
                x2={chartWidth - paddingRight}
                y2={y}
                stroke="#F1F3F5"
                strokeWidth={1}
                strokeDasharray="4 4"
              />
            );
          })}

          {/* Area Fill */}
          <Path d={areaPath} fill="url(#chartGradient)" />

          {/* Bézier Curve Line */}
          <Path
            d={linePath}
            fill="none"
            stroke={lineColor}
            strokeWidth={2.4}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Vertical Active Cursor Line */}
          <Line
            x1={activePoint.x}
            y1={paddingTop}
            x2={activePoint.x}
            y2={chartHeight - paddingBottom}
            stroke="#94A3B8"
            strokeWidth={1.2}
            strokeDasharray="3 3"
          />

          {/* Horizontal Indicator Line from Active Point */}
          <Line
            x1={paddingLeft}
            y1={activePoint.y}
            x2={chartWidth - paddingRight}
            y2={activePoint.y}
            stroke="#CBD5E1"
            strokeWidth={1}
            strokeDasharray="2 2"
          />

          {/* Active Circle Dot */}
          <Circle
            cx={activePoint.x}
            cy={activePoint.y}
            r={5}
            fill="#FFFFFF"
            stroke={lineColor}
            strokeWidth={3}
          />
        </Svg>

        {/* Floating Tooltip matching Investo design */}
        <View
          style={[
            styles.tooltipContainer,
            {
              left: Math.max(10, Math.min(chartWidth - 140, activePoint.x - 70)),
              top: Math.max(10, activePoint.y - 75),
            },
          ]}
          pointerEvents="none"
        >
          <View style={styles.tooltipBox}>
            <View style={styles.tooltipRow}>
              <Text style={styles.tooltipLabel}>Open ▲</Text>
              <Text style={styles.tooltipValue}>
                {formatCurrency(activeData.open || activeData.price * 0.98)}
              </Text>
            </View>
            <View style={[styles.tooltipRow, { marginTop: 4 }]}>
              <Text style={styles.tooltipLabel}>Close ▼</Text>
              <Text style={styles.tooltipValue}>
                {formatCurrency(activeData.close || activeData.price * 1.02)}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Y-Axis Labels (Right Column) */}
      <View style={[styles.yAxisContainer, { height: chartHeight }]}>
        {yLabels.map((val, idx) => (
          <Text key={idx} style={styles.axisText}>
            {val}
          </Text>
        ))}
      </View>

      {/* X-Axis Labels (Bottom Row) */}
      <View style={[styles.xAxisContainer, { width: chartWidth }]}>
        {data.map((d, idx) => (
          <Text
            key={idx}
            style={[
              styles.axisText,
              idx === activeIndex && { color: '#0F172A', fontWeight: '700' },
            ]}
          >
            {d.date}
          </Text>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 8,
  },
  tooltipContainer: {
    position: 'absolute',
    zIndex: 20,
  },
  tooltipBox: {
    backgroundColor: '#1E232A',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
    minWidth: 125,
  },
  tooltipRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tooltipLabel: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '500',
    marginRight: 8,
  },
  tooltipValue: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  yAxisContainer: {
    position: 'absolute',
    right: 0,
    top: 10,
    width: 38,
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 10,
  },
  xAxisContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    marginTop: 4,
  },
  axisText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '500',
  },
});
