import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput } from 'react-native';
import { X, Check } from 'lucide-react-native';
import { Stock } from '../types';
import { useStockStore } from '../store/useStockStore';
import { BrandLogo } from './BrandLogo';
import { formatCurrency, formatNumber } from '../utils/formatters';

interface BuyModalProps {
  visible: boolean;
  stock: Stock | null;
  onClose: () => void;
}

export const BuyModal: React.FC<BuyModalProps> = ({ visible, stock, onClose }) => {
  const { buyStock } = useStockStore();
  const [amountStr, setAmountStr] = useState('250');
  const [success, setSuccess] = useState(false);

  if (!stock) return null;

  const amount = parseFloat(amountStr) || 0;
  const estimatedShares = stock.price > 0 ? amount / stock.price : 0;

  const handleBuy = () => {
    if (amount <= 0) return;
    const ok = buyStock(stock.id, amount);
    if (ok) {
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1000);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <BrandLogo name={stock.logo} size={36} />
              <View style={{ marginLeft: 10 }}>
                <Text style={styles.title}>Buy {stock.tokenTicker}</Text>
                <Text style={styles.subtitle}>{stock.name}</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <X size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Current Price:</Text>
            <Text style={styles.priceVal}>{formatCurrency(stock.price)}</Text>
          </View>

          <View style={styles.inputCard}>
            <Text style={styles.dollar}>$</Text>
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              value={amountStr}
              onChangeText={setAmountStr}
              placeholder="0"
              placeholderTextColor="#9CA3AF"
            />
            <Text style={styles.currency}>USD</Text>
          </View>

          <View style={styles.sharesEstBox}>
            <Text style={styles.sharesLabel}>Estimated Shares:</Text>
            <Text style={styles.sharesVal}>
              ~{formatNumber(estimatedShares, 4)} {stock.tokenTicker}
            </Text>
          </View>

          <View style={styles.presets}>
            {[100, 250, 500, 1000].map((val) => (
              <TouchableOpacity
                key={val}
                style={[styles.preset, amount === val && styles.presetActive]}
                onPress={() => setAmountStr(val.toString())}
              >
                <Text style={[styles.presetText, amount === val && styles.presetTextActive]}>
                  ${val}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={styles.buyBtn}
            onPress={handleBuy}
            activeOpacity={0.85}
          >
            {success ? (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Check size={18} color="#000" style={{ marginRight: 6 }} />
                <Text style={styles.buyBtnText}>Purchased Successfully!</Text>
              </View>
            ) : (
              <Text style={styles.buyBtnText}>
                Buy {stock.tokenTicker} for {formatCurrency(amount)}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    paddingBottom: 36,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  subtitle: {
    fontSize: 12,
    color: '#6B7280',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    backgroundColor: '#F9FAFB',
    padding: 10,
    borderRadius: 12,
  },
  priceLabel: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  priceVal: {
    fontSize: 14,
    color: '#111827',
    fontWeight: '800',
  },
  inputCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    marginBottom: 12,
  },
  dollar: {
    fontSize: 26,
    fontWeight: '800',
    color: '#111827',
    marginRight: 6,
  },
  input: {
    flex: 1,
    fontSize: 26,
    fontWeight: '800',
    color: '#111827',
  },
  currency: {
    fontSize: 14,
    fontWeight: '700',
    color: '#9CA3AF',
  },
  sharesEstBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  sharesLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  sharesVal: {
    fontSize: 13,
    color: '#059669',
    fontWeight: '700',
  },
  presets: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  preset: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  presetActive: {
    backgroundColor: '#111827',
  },
  presetText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
  },
  presetTextActive: {
    color: '#FFFFFF',
  },
  buyBtn: {
    backgroundColor: '#C6FF00',
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
  },
  buyBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#000000',
  },
});
