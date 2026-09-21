import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import Svg, { Path, Rect, Circle, G } from 'react-native-svg';

interface BrandLogoProps {
  name: string;
  size?: number;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({ name, size = 38 }) => {
  const normalized = (name || '').toLowerCase();

  switch (normalized) {
    case 'sol':
    case 'solana':
    case 'solx':
      return (
        <View style={[styles.container, { width: size, height: size, backgroundColor: '#0B0B14' }]}>
          <Svg width={size * 0.7} height={size * 0.7} viewBox="0 0 397 311">
            <Path
              d="M64.6 237.9c2.4-2.4 5.7-3.8 9.2-3.8h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1l62.7-62.7zM64.6 3.8C67 1.4 70.3 0 73.8 0h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5C.7 77.6-2.2 70.6 1.9 66.5L64.6 3.8zM332.4 117c-2.4-2.4-5.7-3.8-9.2-3.8H5.8c-5.8 0-8.7 7-4.6 11.1l62.7 62.7c2.4 2.4 5.7 3.8 9.2 3.8h317.4c5.8 0 8.7-7 4.6-11.1L332.4 117z"
              fill="#14F195"
            />
          </Svg>
        </View>
      );

    case 'msft':
    case 'microsoft':
      return (
        <View style={[styles.container, { width: size, height: size }]}>
          <Svg width={size * 0.7} height={size * 0.7} viewBox="0 0 24 24">
            <Rect x="1" y="1" width="10" height="10" fill="#F25022" rx="1" />
            <Rect x="13" y="1" width="10" height="10" fill="#7FBA00" rx="1" />
            <Rect x="1" y="13" width="10" height="10" fill="#00A4EF" rx="1" />
            <Rect x="13" y="13" width="10" height="10" fill="#FFB900" rx="1" />
          </Svg>
        </View>
      );

    case 'aapl':
    case 'apple':
      return (
        <View style={[styles.container, { width: size, height: size, backgroundColor: '#F3F4F6' }]}>
          <Svg width={size * 0.6} height={size * 0.6} viewBox="0 0 24 24">
            <Path
              d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.37c.62-.75 1.04-1.8 0.92-2.85-.9.04-1.99.6-2.63 1.35-.57.65-1.07 1.72-.94 2.74 1 .08 2.03-.49 2.65-1.24z"
              fill="#111827"
            />
          </Svg>
        </View>
      );

    case 'nvda':
    case 'nvidia':
      return (
        <View style={[styles.container, { width: size, height: size, backgroundColor: '#EDFBD8' }]}>
          <Svg width={size * 0.7} height={size * 0.7} viewBox="0 0 24 24">
            <Path
              d="M3.5 12c1.2-3.8 5-6.5 9.5-6.5 5.5 0 10 4.5 10 10 0 1.2-.2 2.4-.6 3.5-.8-1.5-2.2-2.6-3.9-3-1.2-3-4.2-5-7.5-5-4.7 0-8.5 3.8-8.5 8.5 0 .9.1 1.7.4 2.5C2.3 17 2 14.5 2 12c0-.5 0-1 .1-1.5 0 .2.4 1 1.4 1.5zm6 0c0-2.2 1.8-4 4-4s4 1.8 4 4c0 1.2-.5 2.3-1.4 3-.8-.6-1.7-1-2.6-1-2.2 0-4 1.8-4 4 0 .3 0 .6.1.9-.9-.7-1.5-1.7-1.5-2.9 0-2.2 1.4-4 1.4-4z"
              fill="#76B900"
            />
          </Svg>
        </View>
      );

    case 'tsla':
    case 'tesla':
      return (
        <View style={[styles.container, { width: size, height: size, backgroundColor: '#FEE2E2' }]}>
          <Svg width={size * 0.7} height={size * 0.7} viewBox="0 0 24 24">
            <Path
              d="M12 4.5c2.6 0 5.4.6 7.6 1.8l.9-1.9C17.8 3 14.9 2.3 12 2.3S6.2 3 3.5 4.4l.9 1.9c2.2-1.2 5-1.8 7.6-1.8zm8.6 4c-.7-.4-1.7-.6-2.6-.6-2.1 0-4 1.1-5 2.8-.5-.9-1.4-1.7-2.5-2.2-1.1-.5-2.3-.7-3.5-.6-.9 0-1.9.2-2.6.6l-.9-1.6C4.8 6.2 6.4 5.8 8.1 5.7c1.7 0 3.3.4 4.8 1.2 1.4-.8 3-1.2 4.8-1.2 1.7 0 3.3.4 4.7 1.2l-.8 1.6zM12 21.7c.3-2.1 1.1-7.2 4-9.3.9-.7 2-1 3.1-1 .4 0 .9.1 1.3.2l.6-1.5c-1.3-.4-2.7-.6-4-.4-2 0-3.8.9-5 2.4-1.2-1.5-3-2.4-5-2.4-1.3-.2-2.7 0-4 .4l.6 1.5c.4-.1.9-.2 1.3-.2 1.1 0 2.2.3 3.1 1 2.9 2.1 3.7 7.2 4 9.3z"
              fill="#E82127"
            />
          </Svg>
        </View>
      );

    case 'amzn':
    case 'amazon':
      return (
        <View style={[styles.container, { width: size, height: size, backgroundColor: '#FEF3C7' }]}>
          <Svg width={size * 0.7} height={size * 0.7} viewBox="0 0 24 24">
            <Path
              d="M14.5 12.8c-.8.6-2 .9-3 .9-1.7 0-2.8-.8-2.8-2.2 0-1.7 1.3-2.4 3.7-2.4.7 0 1.5.1 2.1.2v3.5zm2.8 4.2c-.3-.4-.5-.9-.5-1.4v-5.2c0-2.3-1.6-3.8-47-3.8-2.3 0-4.3.9-5.1 1.7l1.3 1.9c.7-.6 1.9-1.2 3.4-1.2 1.7 0 2.5.8 2.5 2.1v.5c-.7-.1-1.6-.2-2.6-.2-3.6 0-5.7 1.5-5.7 4.1 0 2.4 1.8 3.7 4.2 3.7 2 0 3.3-.8 4-1.8.3.7.9 1.3 1.8 1.3.7 0 1.5-.3 2.1-.8l-.7-1.7c-.3.2-.7.3-1 .3-.5 0-.8-.3-.8-.8zM3 18.5c4.5 3 11.2 3.5 16.5.5.3-.2.3-.6 0-.8-.3-.2-.7-.1-.9.1-4.8 2.6-10.8 2.2-14.8-.4-.3-.2-.7-.1-.9.2-.1.2 0 .4.1.4z"
              fill="#FF9900"
            />
          </Svg>
        </View>
      );

    case 'googl':
    case 'google':
      return (
        <View style={[styles.container, { width: size, height: size, backgroundColor: '#EFF6FF' }]}>
          <Svg width={size * 0.65} height={size * 0.65} viewBox="0 0 24 24">
            <Path
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              fill="#4285F4"
            />
            <Path
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              fill="#34A853"
            />
            <Path
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              fill="#FBBC05"
            />
            <Path
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              fill="#EA4335"
            />
          </Svg>
        </View>
      );

    case 'meta':
      return (
        <View style={[styles.container, { width: size, height: size, backgroundColor: '#EFF6FF' }]}>
          <Svg width={size * 0.7} height={size * 0.7} viewBox="0 0 24 24">
            <Path
              d="M12 4C7.03 4 3 8.03 3 13c0 4.97 4.03 9 9 9s9-4.03 9-9c0-4.97-4.03-9-9-9zm4.6 12.2c-.8.8-1.9 1.3-3.1 1.3-1.2 0-2.3-.5-3.1-1.3l-1.4 1.4c1.2 1.2 2.8 1.9 4.5 1.9s3.3-.7 4.5-1.9l-1.4-1.4z"
              fill="#0668E1"
            />
          </Svg>
        </View>
      );

    case 'coin':
    case 'coinbase':
      return (
        <View style={[styles.container, { width: size, height: size, backgroundColor: '#0052FF' }]}>
          <Text style={{ color: '#FFFFFF', fontWeight: '900', fontSize: size * 0.38 }}>C</Text>
        </View>
      );

    case 'nflx':
    case 'netflix':
      return (
        <View style={[styles.container, { width: size, height: size, backgroundColor: '#000000' }]}>
          <Text style={{ color: '#E50914', fontWeight: '900', fontSize: size * 0.42 }}>N</Text>
        </View>
      );

    case 'amd':
      return (
        <View style={[styles.container, { width: size, height: size, backgroundColor: '#000000' }]}>
          <Text style={{ color: '#ED1C24', fontWeight: '900', fontSize: size * 0.32 }}>AMD</Text>
        </View>
      );

    case 'dis':
    case 'disney':
      return (
        <View style={[styles.container, { width: size, height: size, backgroundColor: '#001D4A' }]}>
          <Text style={{ color: '#FFFFFF', fontWeight: '900', fontSize: size * 0.32 }}>DIS</Text>
        </View>
      );

    case 'sbux':
    case 'starbucks':
      return (
        <View style={[styles.container, { width: size, height: size, backgroundColor: '#E6F4EA' }]}>
          <Svg width={size * 0.7} height={size * 0.7} viewBox="0 0 24 24">
            <Circle cx="12" cy="12" r="10" fill="#00704A" />
            <Path
              d="M12 6l1.2 2.5 2.8.4-2 2 .5 2.8-2.5-1.3-2.5 1.3.5-2.8-2-2 2.8-.4z"
              fill="#FFFFFF"
            />
          </Svg>
        </View>
      );

    case 'uber':
      return (
        <View style={[styles.container, { width: size, height: size, backgroundColor: '#000000' }]}>
          <Text style={{ color: '#FFFFFF', fontWeight: '900', fontSize: size * 0.35 }}>Uber</Text>
        </View>
      );

    case 'nke':
    case 'nike':
      return (
        <View style={[styles.container, { width: size, height: size, backgroundColor: '#111827' }]}>
          <Svg width={size * 0.65} height={size * 0.65} viewBox="0 0 24 24">
            <Path
              d="M21.7 5.3c-.3-.2-.8-.2-1 .1L8.5 16.2c-1.4 1.3-3.4 1.4-4.8.2-1.6-1.3-1.8-3.7-.4-5.3 1.2-1.3 3.1-1.8 4.7-1.1.4.2.8.1 1-.2.2-.4.1-.8-.2-1-2.2-.9-4.8-.3-6.4 1.5-1.9 2.2-1.6 5.5.6 7.4 2 1.7 4.9 1.5 6.9-.3L21.8 6.4c.2-.3.2-.8-.1-1.1z"
              fill="#FFFFFF"
            />
          </Svg>
        </View>
      );

    case 'pltr':
    case 'palantir':
      return (
        <View style={[styles.container, { width: size, height: size, backgroundColor: '#111827' }]}>
          <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: size * 0.32 }}>PLTR</Text>
        </View>
      );

    case 'crm':
    case 'salesforce':
      return (
        <View style={[styles.container, { width: size, height: size, backgroundColor: '#00A1E0' }]}>
          <Text style={{ color: '#FFFFFF', fontWeight: '900', fontSize: size * 0.35 }}>CRM</Text>
        </View>
      );

    case 'intc':
    case 'intel':
      return (
        <View style={[styles.container, { width: size, height: size, backgroundColor: '#0071C5' }]}>
          <Text style={{ color: '#FFFFFF', fontWeight: '900', fontSize: size * 0.35 }}>INTC</Text>
        </View>
      );

    case 'pypl':
    case 'paypal':
      return (
        <View style={[styles.container, { width: size, height: size, backgroundColor: '#003087' }]}>
          <Text style={{ color: '#0079C1', fontWeight: '900', fontSize: size * 0.4 }}>P</Text>
        </View>
      );

    case 'spy':
    case 'spdr':
      return (
        <View style={[styles.container, { width: size, height: size, backgroundColor: '#1E3A8A' }]}>
          <Text style={{ color: '#60A5FA', fontWeight: '900', fontSize: size * 0.34 }}>SPY</Text>
        </View>
      );

    case 'qqq':
    case 'invesco':
      return (
        <View style={[styles.container, { width: size, height: size, backgroundColor: '#4C1D95' }]}>
          <Text style={{ color: '#C4B5FD', fontWeight: '900', fontSize: size * 0.34 }}>QQQ</Text>
        </View>
      );

    case 'brk':
    case 'berkshire':
      return (
        <View style={[styles.container, { width: size, height: size, backgroundColor: '#312E81' }]}>
          <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: size * 0.34 }}>BRK</Text>
        </View>
      );

    case 'vti':
    case 'vanguard':
      return (
        <View style={[styles.container, { width: size, height: size, backgroundColor: '#991B1B' }]}>
          <Text style={{ color: '#FFFFFF', fontWeight: '900', fontSize: size * 0.34 }}>VTI</Text>
        </View>
      );

    case 'ib01':
    case 'treasury':
      return (
        <View style={[styles.container, { width: size, height: size, backgroundColor: '#065F46' }]}>
          <Text style={{ color: '#A7F3D0', fontWeight: '900', fontSize: size * 0.3 }}>IB01</Text>
        </View>
      );

    case 'cspx':
      return (
        <View style={[styles.container, { width: size, height: size, backgroundColor: '#1E293B' }]}>
          <Text style={{ color: '#38BDF8', fontWeight: '900', fontSize: size * 0.3 }}>CSPX</Text>
        </View>
      );

    default:
      return (
        <View style={[styles.container, { width: size, height: size, backgroundColor: '#1E293B' }]}>
          <Text style={{ color: '#C6FF00', fontWeight: '800', fontSize: size * 0.36 }}>
            {(name || 'X').slice(0, 3).toUpperCase()}
          </Text>
        </View>
      );
  }
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
});

