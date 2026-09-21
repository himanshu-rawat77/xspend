import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ActivityIndicator } from 'react-native';
import { CheckCircle, Zap, ExternalLink, Copy, Check, RotateCcw, Clock, AlertCircle } from 'lucide-react-native';
import { SpendTransaction } from '../types';
import { formatCurrency, formatNumber, shortenAddress, formatTxNetworkStatus, getTxConfirmationStatus } from '../utils/formatters';
import { useStockStore } from '../store/useStockStore';
import { getConnection, confirmTransaction } from '../services/wallet';

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
  const [copied, setCopied] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const storeTx = useStockStore((s) =>
    transaction ? s.transactions.find((t) => t.id === transaction.id) : undefined
  );
  const settleSpend = useStockStore((s) => s.settleSpend);
  const markSpendStatus = useStockStore((s) => s.markSpendStatus);
  const syncRealBalances = useStockStore((s) => s.syncRealBalances);
  const preferredNetwork = useStockStore((s) => s.preferences.preferredNetwork);

  if (!transaction) return null;
  const live = storeTx || transaction;
  const status = getTxConfirmationStatus(live);
  const isDemo = live.solanaTxSignature?.startsWith('demo_');
  const pending = !isDemo && (status === 'submitted' || status === 'confirming');
  const needsAction = !isDemo && (status === 'failed' || status === 'unknown');
  const settled = isDemo || status === 'confirmed';

  const isBonus = live.rewardType === 'same_brand_bonus';
  const isPoints = live.rewardType === 'protocol_token';

  const handleRetryStatus = async () => {
    if (!live.solanaTxSignature || isRetrying) return;
    setIsRetrying(true);
    markSpendStatus(live.id, 'confirming');
    try {
      const cluster = preferredNetwork === 'solana-mainnet' ? 'mainnet-beta' : 'devnet';
      const result = await confirmTransaction(getConnection(cluster), live.solanaTxSignature, 45000);
      if (result === 'confirmed') {
        settleSpend(live.id);
        syncRealBalances().catch(() => {});
      } else {
        markSpendStatus(live.id, result);
      }
    } catch {
      markSpendStatus(live.id, 'unknown');
    } finally {
      setIsRetrying(false);
    }
  };

  const handleCopy = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          {/* Status Icon */}
          <View style={[styles.iconCircle, needsAction && { backgroundColor: '#FEF2F2' }, pending && { backgroundColor: '#FFFBEB' }]}>
            {needsAction ? (
              <AlertCircle size={44} color="#DC2626" strokeWidth={2.4} />
            ) : pending ? (
              <Clock size={44} color="#D97706" strokeWidth={2.4} />
            ) : (
              <CheckCircle size={44} color="#10B981" strokeWidth={2.4} />
            )}
          </View>

          <Text style={styles.title}>
            {needsAction ? 'Payment needs attention' : pending ? 'Payment submitted' : 'Payment Successful!'}
          </Text>
          <Text style={styles.subtitle}>
            Paid to {live.merchantName}
          </Text>

          {/* Amount Paid */}
          <Text style={styles.amountText}>
            {formatCurrency(live.amountUSD)}
          </Text>

          {/* Reward Highlight Box */}
          <View style={[styles.rewardBox, !settled ? styles.rewardBoxPending : isBonus ? styles.rewardBoxBonus : styles.rewardBoxStandard]}>
            <View style={styles.rewardIconBadge}>
              <Zap size={16} color={!settled ? '#92400E' : isBonus ? '#000000' : '#10B981'} fill={!settled ? '#92400E' : isBonus ? '#000000' : '#10B981'} />
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={[styles.rewardTitle, isBonus && settled && { color: '#000000' }, !settled && { color: '#92400E' }]}>
                {!settled
                  ? 'Rewards pending on-chain confirmation'
                  : isBonus
                  ? '1.5% Same-Brand StockBack™ Earned! (Sandbox)'
                  : isPoints
                  ? '1.0% xToken Points Earned! (Sandbox)'
                  : '1.0% StockBack™ Earned! (Sandbox Pool)'}
              </Text>
              <Text style={[styles.rewardDetail, isBonus && settled && { color: '#1F2937' }, !settled && { color: '#B45309' }]}>
                {isPoints
                  ? `+${Math.round(live.rewardAmount)} xToken Points`
                  : `+${formatNumber(live.rewardAmount, 4)} ${live.rewardTicker} (+${formatCurrency(live.rewardValueUSD)})`}
              </Text>
            </View>
          </View>

          {/* Transaction Summary Breakdown */}
          <View style={styles.breakdownTable}>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Liquidated Stock</Text>
              <Text style={styles.rowVal}>
                {formatNumber(live.stockSoldAmount, 4)} {live.stockSoldTicker}
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Settlement Route</Text>
              <Text style={styles.rowValBlue}>
                {live.jupiterRoute.inToken} → USDC
              </Text>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Solana Signature</Text>
              <TouchableOpacity style={styles.sigRow} onPress={handleCopy}>
                <Text style={styles.sigText}>
                  {shortenAddress(live.solanaTxSignature, 5)}
                </Text>
                {copied ? <Check size={12} color="#10B981" /> : <Copy size={12} color="#6B7280" />}
              </TouchableOpacity>
            </View>
            <View style={styles.row}>
              <Text style={styles.rowLabel}>Network Status</Text>
              <View style={isDemo ? styles.demoBadge : pending ? styles.pendingBadge : needsAction ? styles.failedBadge : styles.finalizedBadge}>
                <Text style={isDemo ? styles.demoBadgeText : pending ? styles.pendingText : needsAction ? styles.failedText : styles.finalizedText}>
                  {formatTxNetworkStatus(live)}
                </Text>
              </View>
            </View>
          </View>

          {needsAction && (
            <TouchableOpacity style={styles.retryBtn} onPress={handleRetryStatus} disabled={isRetrying} activeOpacity={0.85}>
              {isRetrying ? (
                <ActivityIndicator size="small" color="#111827" />
              ) : (
                <>
                  <RotateCcw size={14} color="#111827" style={{ marginRight: 6 }} />
                  <Text style={styles.retryBtnText}>Retry status check</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {/* View on Solana Explorer Link */}
          {!isDemo && (
            <TouchableOpacity
              style={styles.explorerBtn}
              onPress={() => {
                const isDev = preferredNetwork === 'solana-devnet';
                const url = isDev
                  ? `https://solscan.io/tx/${live.solanaTxSignature}?cluster=devnet`
                  : `https://solscan.io/tx/${live.solanaTxSignature}`;
                require('react-native').Linking.openURL(url).catch(() => {});
              }}
              activeOpacity={0.7}
            >
              <ExternalLink size={14} color="#6B7280" style={{ marginRight: 6 }} />
              <Text style={styles.explorerBtnText}>
              View on Solscan Explorer {preferredNetwork === 'solana-devnet' ? '(Devnet)' : ''}
              </Text>
            </TouchableOpacity>
          )}

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
  demoBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  demoBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6B7280',
  },
  rewardBoxPending: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  pendingBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  pendingText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B45309',
  },
  failedBadge: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  failedText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B91C1C',
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 14,
    paddingVertical: 10,
    width: '100%',
    marginBottom: 10,
  },
  retryBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
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
