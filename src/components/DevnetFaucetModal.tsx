import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import {
  X,
  Droplets,
  Zap,
  CheckCircle2,
  ShieldCheck,
  ArrowRight,
  ExternalLink,
  Coins,
  Sparkles,
  Wallet,
} from 'lucide-react-native';
import { BrandLogo } from './BrandLogo';
import { formatCurrency, formatNumber, shortenAddress } from '../utils/formatters';
import { useStockStore } from '../store/useStockStore';
import { claimDevnetTestPackage, FaucetClaimResult } from '../services/faucet';
import { getConnection } from '../services/wallet';

interface DevnetFaucetModalProps {
  visible: boolean;
  onClose: () => void;
  onStartSpend?: () => void;
}

export const DevnetFaucetModal: React.FC<DevnetFaucetModalProps> = ({
  visible,
  onClose,
  onStartSpend,
}) => {
  const { walletAddress, solBalance, syncRealBalances } = useStockStore();
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimResult, setClaimResult] = useState<FaucetClaimResult | null>(null);

  const testAssets = [
    { name: 'Devnet SOL', ticker: 'SOL', amount: '1.0 SOL', valueUSD: 'Gas & Fees', logo: 'solana' },
    { name: 'Apple xStock', ticker: 'AAPLx', amount: '5.0 AAPLx', valueUSD: ',161.25', logo: 'apple' },
    { name: 'NVIDIA xStock', ticker: 'NVDAx', amount: '10.0 NVDAx', valueUSD: ',403.60', logo: 'nvidia' },
    { name: 'Tesla xStock', ticker: 'TSLAx', amount: '4.0 TSLAx', valueUSD: '.60', logo: 'tesla' },
    { name: 'Devnet USDC', ticker: 'USDC', amount: '100.0 USDC', valueUSD: '.00', logo: 'usdc' },
  ];

  const handleClaim = async () => {
    if (isClaiming) return;
    setIsClaiming(true);
    setClaimResult(null);
    try {
      const conn = getConnection('devnet');
      const targetWallet = walletAddress || '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosg4B9';
      const result = await claimDevnetTestPackage(conn, targetWallet);
      if (walletAddress) {
        await syncRealBalances();
      }
      setClaimResult(result);
    } catch (e: any) {
      setClaimResult({
        success: false,
        solAirdropped: 0,
        tokensClaimed: [],
        error: e?.message || 'Faucet failed. Tokens are not credited locally.',
      });
    } finally {
      setIsClaiming(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={styles.iconCircle}>
                <Droplets size={20} color="#7C3AED" />
              </View>
              <View style={{ marginLeft: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={styles.title}>Devnet Test Faucet</Text>
                  <View style={styles.liveBadge}>
                    <Text style={styles.liveBadgeText}>100% FREE</Text>
                  </View>
                </View>
                <Text style={styles.subtitle}>Airdrop Devnet SOL for fees. Mint tUSDC with npm run setup:devnet.</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <X size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={styles.content}>
            {/* Connected Wallet Info */}
            <View style={styles.walletCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Wallet size={16} color="#7C3AED" />
                <Text style={styles.walletCardLabel}>Connected Recipient Wallet:</Text>
              </View>
              <View style={styles.walletMetaRow}>
                <Text style={styles.walletAddress}>
                  {walletAddress ? shortenAddress(walletAddress, 6) : 'Not Connected (Default Mock)'}
                </Text>
                <View style={styles.solPill}>
                  <Text style={styles.solPillText}>{formatNumber(solBalance, 3)} SOL</Text>
                </View>
              </View>
            </View>

            {/* Test Assets Package Breakdown */}
            <Text style={styles.sectionHeader}>Test Assets Dispensed:</Text>
            <View style={styles.assetsGrid}>
              {testAssets.map((asset, idx) => (
                <View key={idx} style={styles.assetItem}>
                  <BrandLogo name={asset.logo} size={26} />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.assetName}>{asset.name}</Text>
                    <Text style={styles.assetAmount}>{asset.amount}</Text>
                  </View>
                  <Text style={styles.assetVal}>{asset.valueUSD}</Text>
                </View>
              ))}
            </View>

            {/* Success Banner */}
            {claimResult && (
              <View style={[styles.successBanner, claimResult.error && { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' }]}>
                <CheckCircle2 size={18} color={claimResult.error ? '#D97706' : '#16A34A'} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={[styles.successTitle, claimResult.error && { color: '#92400E' }]}>
                    {claimResult.error ? 'Faucet did not mint tokens' : 'On-chain SOL claimed'}
                  </Text>
                  <Text style={[styles.successDesc, claimResult.error && { color: '#B45309' }]}>
                    {claimResult.error
                      || `Airdropped ${claimResult.solAirdropped} SOL` +
                        (claimResult.tokensClaimed[0]
                          ? `. Wallet holds ${claimResult.tokensClaimed[0].amount} ${claimResult.tokensClaimed[0].ticker}.`
                          : '.')}
                  </Text>
                </View>
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.actionContainer}>
              <TouchableOpacity
                style={[styles.claimButton, isClaiming && styles.claimButtonDisabled]}
                onPress={handleClaim}
                disabled={isClaiming}
                activeOpacity={0.85}
              >
                {isClaiming ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 8 }} />
                    <Text style={styles.claimButtonText}>Airdropping Test Portfolio...</Text>
                  </View>
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Droplets size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                    <Text style={styles.claimButtonText}>
                      {claimResult ? 'Claim More Devnet SOL' : 'Claim 1 Devnet SOL'}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>

              {claimResult && onStartSpend && (
                <TouchableOpacity
                  style={styles.spendButton}
                  onPress={() => {
                    onClose();
                    onStartSpend();
                  }}
                  activeOpacity={0.85}
                >
                  <Text style={styles.spendButtonText}>⚡ Test Instant Checkout Now</Text>
                  <ArrowRight size={16} color="#141416" />
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '88%',
    paddingBottom: 32,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EDE9FE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: '#111827',
  },
  subtitle: {
    fontSize: 11.5,
    color: '#6B7280',
    marginTop: 2,
  },
  liveBadge: {
    backgroundColor: '#7C3AED',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 6,
  },
  liveBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  walletCard: {
    backgroundColor: '#FAF5FF',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#DDD6FE',
    marginBottom: 16,
  },
  walletCardLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#5B21B6',
    marginLeft: 6,
  },
  walletMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  walletAddress: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
    fontFamily: 'monospace',
  },
  solPill: {
    backgroundColor: '#EDE9FE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  solPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#6D28D9',
  },
  sectionHeader: {
    fontSize: 13,
    fontWeight: '800',
    color: '#374151',
    marginBottom: 10,
  },
  assetsGrid: {
    backgroundColor: '#F9FAFB',
    borderRadius: 18,
    padding: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 16,
  },
  assetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    marginBottom: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  assetName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
  assetAmount: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 1,
  },
  assetVal: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#16A34A',
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#BBF7D0',
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#15803D',
  },
  successDesc: {
    fontSize: 11,
    color: '#166534',
    marginTop: 2,
    lineHeight: 15,
  },
  actionContainer: {
    marginTop: 4,
    marginBottom: 20,
    gap: 10,
  },
  claimButton: {
    backgroundColor: '#7C3AED',
    paddingVertical: 14,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#7C3AED',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  claimButtonDisabled: {
    opacity: 0.7,
  },
  claimButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  spendButton: {
    backgroundColor: '#C6FF00',
    paddingVertical: 14,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  spendButtonText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#141416',
  },
});
