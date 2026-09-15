import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TextInput } from 'react-native';
import { X, ArrowDownLeft, ArrowUpRight, Check } from 'lucide-react-native';
import { useStockStore } from '../store/useStockStore';
import { formatCurrency } from '../utils/formatters';

interface DepositWithdrawModalProps {
  visible: boolean;
  type: 'deposit' | 'withdraw';
  onClose: () => void;
}

export const DepositWithdrawModal: React.FC<DepositWithdrawModalProps> = ({
  visible,
  type,
  onClose,
}) => {
  const { totalPortfolioValue, depositFunds, withdrawFunds } = useStockStore();
  const [amountStr, setAmountStr] = useState('1000');
  const [success, setSuccess] = useState(false);

  const amount = parseFloat(amountStr) || 0;
  const isDeposit = type === 'deposit';

  const handleAction = () => {
    if (amount <= 0) return;

    if (isDeposit) {
      depositFunds(amount);
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 1000);
    } else {
      const ok = withdrawFunds(amount);
      if (ok) {
        setSuccess(true);
        setTimeout(() => {
          setSuccess(false);
          onClose();
        }, 1000);
      }
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>
              {isDeposit ? 'Deposit Funds' : 'Withdraw Funds'}
            </Text>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <X size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <Text style={styles.subtext}>
            {isDeposit
              ? 'Deposit USDC or SOL into your StockSpend trading account'
              : `Available balance: ${formatCurrency(totalPortfolioValue)}`}
          </Text>

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

          <View style={styles.presets}>
            {[100, 500, 1000, 5000].map((val) => (
              <TouchableOpacity
                key={val}
                style={[styles.preset, amount === val && styles.presetActive]}
                onPress={() => setAmountStr(val.toString())}
              >
                <Text
                  style={[
                    styles.presetText,
                    amount === val && styles.presetTextActive,
                  ]}
                >
                  ${val}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TouchableOpacity
            style={[
              styles.actionBtn,
              isDeposit ? styles.depositBtn : styles.withdrawBtn,
            ]}
            onPress={handleAction}
            activeOpacity={0.85}
          >
            {success ? (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Check size={18} color="#000" style={{ marginRight: 6 }} />
                <Text style={styles.btnText}>Success!</Text>
              </View>
            ) : (
              <Text style={styles.btnText}>
                {isDeposit
                  ? `Deposit ${formatCurrency(amount)}`
                  : `Withdraw ${formatCurrency(amount)}`}
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
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  subtext: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 6,
    marginBottom: 20,
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
    marginBottom: 16,
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
  presets: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
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
  actionBtn: {
    borderRadius: 18,
    paddingVertical: 16,
    alignItems: 'center',
  },
  depositBtn: {
    backgroundColor: '#C6FF00',
  },
  withdrawBtn: {
    backgroundColor: '#111827',
  },
  btnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#000000',
  },
});
