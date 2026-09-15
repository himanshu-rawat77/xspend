import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Share } from 'react-native';
import { CheckCircle, Zap, ExternalLink, Copy, Check } from 'lucide-react-native';
import { SpendTransaction } from '../types';
import { BrandLogo } from './BrandLogo';
import { formatCurrency, formatNumber, shortenAddress } from '../utils/formatters';

interface ReceiptModalProps {
  visible: boolean;
  transaction: SpendTransaction | null;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  visible,
  transaction,
  onClose,
}) => {
  const [copied, setCopied] = React.useState(false);

  if (!transaction) return null;

  const isBonus = transaction.rewardType === 'same_brand_bonus';
  const isPoints = transaction.rewardType === 'protocol_token';

  const handleCopy = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Success Icon */}
          <View style={styles.iconCircle}>
            <CheckCircle size={44} color="#10B981" strokeWidth={2.4} />
          </View>

          <Text style={styles.title}>Payment Successful!</Text>
          <Text style={styles.subtitle}>
            Paid to {transaction.merchantName}
          </Text>

          {/* Amount Paid */}
          <Text style={styles.amountText}>
            {formatCurrency(transaction.amountUSD)}
          </Text>

          {/* Reward Highlight Box */}
          <View style={[styles.rewardBox, isBonus ? styles.rewardBoxBonus : styles.rewardBoxStandard]}>
            <View style={styles.rewardIconBadge}>
              <Zap size={16} color={isBonus ? '#000000' : '#10B981'} fill={isBonus ? '#000000' : '#10B981'} />
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={[styles.rewardTitle, isBonus && { color: '#000000' }]}>
                {isBonus ? '1.5% Same-Brand StockBack Earned!' : isPoints ? '1.0% xToken Points Earned!' : '1.0% StockBack Earned!'}
              </Text>
              <Text style={[styles.rewardDetail, isBonus && { color: '#1F2937' }]}>
                {isPoints
                  ? `+${Math.round(transaction.rewardAmount)} xToken Points`
                  : `+${formatNumber(transaction.rewardAmount, 4)} ${transaction.rewardTicker} (+${formatCurrency(transaction.rewardValueUSD)})`}
              </Text>
            </View>
          </View>

          {/* Transaction Summary Breakdown */}
          <View style={styles.breakdownTable}>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Liquidated Stock</Text>
              <Text style={styles.rowVal}>
                {formatNumber(transaction.stockSoldAmount, 4)} {transaction.stockSoldTicker}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Settlement Route</Text>
              <Text style={styles.rowValBlue}>
                {transaction.jupiterRoute.inToken} → USDC
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Solana Signature</Text>
              <TouchableOpacity style={styles.sigRow} onPress={handleCopy}>
                <Text style={styles.sigText}>
                  {shortenAddress(transaction.solanaTxSignature, 5)}
                </Text>
                {copied ? <Check size={12} color="#10B981" /> : <Copy size={12} color="#6B7280" />}
              </TouchableOpacity>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Network Status</Text>
              <View style={styles.finalizedBadge}>
                <Text style={styles.finalizedText}>Finalized (Solana)</Text>
              </View>
            </View>
          </View>

          {/* View on Solana Explorer Link */}
          <TouchableOpacity
            style={styles.explorerBtn}
            onPress={() => {
              const url = `https://solscan.io/tx/${transaction.solanaTxSignature}`;
              require('react-native').Linking.openURL(url).catch(() => {});
            }}
            activeOpacity={0.7}
          >
            <ExternalLink size={14} color="#6B7280" style={{ marginRight: 6 }} />
            <Text style={styles.explorerBtnText}>View on Solscan Explorer</Text>
          </TouchableOpacity>

          {/* Done Button */}
          <TouchableOpacity style={styles.doneBtn} onPress={onClose} activeOpacity={0.85}>
            <Text style={styles.doneBtnText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    width: '100%',
    maxWidth: 380,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  iconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#ECFDF5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
  },
  subtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
    marginBottom: 10,
  },
  amountText: {
    fontSize: 32,
    fontWeight: '900',
    color: '#111827',
    marginBottom: 16,
    letterSpacing: -0.5,
  },
  rewardBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    padding: 14,
    width: '100%',
    marginBottom: 16,
  },
  rewardBoxStandard: {
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#DCFCE7',
  },
  rewardBoxBonus: {
    backgroundColor: '#C6FF00',
  },
  rewardIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rewardTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#065F46',
  },
  rewardDetail: {
    fontSize: 13,
    fontWeight: '700',
    color: '#047857',
    marginTop: 2,
  },
  breakdownTable: {
    backgroundColor: '#F8F9FA',
    borderRadius: 18,
    padding: 14,
    width: '100%',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#EEF0F2',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 4,
  },
  rowLabel: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  rowVal: {
    fontSize: 12.5,
    color: '#111827',
    fontWeight: '700',
  },
  rowValBlue: {
    fontSize: 12,
    color: '#2563EB',
    fontWeight: '700',
  },
  sigRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  sigText: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: '#374151',
    marginRight: 4,
  },
  finalizedBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  finalizedText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#16A34A',
  },
  explorerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    marginBottom: 12,
  },
  explorerBtnText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#6B7280',
    textDecorationLine: 'underline',
  },
  doneBtn: {
    backgroundColor: '#111827',
    borderRadius: 18,
    paddingVertical: 14,
    width: '100%',
    alignItems: 'center',
  },
  doneBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
});
