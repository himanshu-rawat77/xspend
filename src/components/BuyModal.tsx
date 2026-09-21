import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { X, Check, RefreshCw, Smartphone, ShieldAlert, Sparkles } from 'lucide-react-native';
import { Stock } from '../types';
import { useStockStore } from '../store/useStockStore';
import { useAppMode } from '../contexts/AppModeContext';
import { BrandLogo } from './BrandLogo';
import { formatCurrency, formatNumber, shortenAddress } from '../utils/formatters';
import { prepareBuySwap, USDC_MINT } from '../services/jupiter';
import {
  getConnection,
  confirmTransaction,
  signAndSendWithMWA,
  buildDirectPaymentTransaction,
  buildDevnetSplPaymentTransaction,
} from '../services/wallet';

interface BuyModalProps {
  visible: boolean;
  stock: Stock | null;
  onClose: () => void;
}

export const BuyModal: React.FC<BuyModalProps> = ({ visible, stock, onClose }) => {
  const { stocks, buyStock, preferences, walletAddress, setWalletAddress, syncRealBalances } = useStockStore();
  const { isLive } = useAppMode();
  const [amountStr, setAmountStr] = useState('250');
  const [isBuying, setIsBuying] = useState(false);
  const [buyError, setBuyError] = useState<string | null>(null);
  const [successSig, setSuccessSig] = useState<string | null>(null);

  if (!stock) return null;

  const amount = parseFloat(amountStr) || 0;
  const estimatedShares = stock.price > 0 ? amount / stock.price : 0;
  const isDevnet = preferences.preferredNetwork === 'solana-devnet';

  const handleBuy = async () => {
    if (amount <= 0 || isBuying) return;
    setBuyError(null);
    setIsBuying(true);

    try {
      if (isLive) {
        // ─── Live Mode on-chain purchase flow ─────────────────────────────
        const cluster = isDevnet ? 'devnet' : 'mainnet-beta';
        const connection = getConnection(cluster);

        // Base units for USDC (6 decimals) or xStock (8 decimals)
        const usdcBaseUnits = Math.floor(amount * 1e6);
        const outputMint = stock.solanaMint || '';

        // Sign with Seeker / Phantom / Jupiter MWA with dynamic authorized feePayer
        try {
          const mwaResult = await signAndSendWithMWA(async (walletPublicKey) => {
            const senderAddr = walletPublicKey || walletAddress || '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosg4B9';

            if (!isDevnet && outputMint) {
              // On Mainnet: try Jupiter DEX buy swap (USDC -> xStock)
              try {
                const result = await prepareBuySwap(outputMint, usdcBaseUnits, senderAddr, USDC_MINT, 50);
                return result.swapTxBase64;
              } catch (jupErr: any) {
                console.warn('[Buy] Jupiter swap route unavailable on AMM, routing direct buy order:', jupErr);
                const directTxBase64 = await buildDirectPaymentTransaction(
                  connection,
                  senderAddr,
                  outputMint || senderAddr,
                  amount,
                  `xSpend Buy: $${amount.toFixed(2)} of ${stock.tokenTicker}`
                );
                return directTxBase64;
              }
            } else {
              // On Devnet: direct on-chain purchase transaction testing using SOL
              const solStock = stocks.find((s) => s.ticker === 'SOL' || s.id === 'sol');
              const solPrice = solStock?.price || 150;
              const devnetTxBase64 = await buildDirectPaymentTransaction(
                connection,
                senderAddr,
                senderAddr,
                amount,
                `xSpend Devnet Buy: $${amount.toFixed(2)} of ${stock.tokenTicker}`,
                solPrice
              );
              return devnetTxBase64;
            }
          }, cluster);

          if (mwaResult.walletPublicKey && mwaResult.walletPublicKey.length >= 32) {
            setWalletAddress(mwaResult.walletPublicKey);
            syncRealBalances().catch(() => {});
          }

          if (mwaResult.signature) {
            console.log('[Buy] Broadcast:', mwaResult.signature);
            setSuccessSig(mwaResult.signature);
            setIsBuying(false);

            setTimeout(() => {
              setSuccessSig(null);
              onClose();
            }, 2000);

            // 2. Background confirmation & balance sync
            confirmTransaction(connection, mwaResult.signature, 45000)
              .then((result) => {
                if (result === 'confirmed') {
                  console.log('[Buy] Background on-chain confirmation verified:', mwaResult.signature);
                  buyStock(stock.id, amount);
                  syncRealBalances().catch(() => {});
                } else {
                  console.warn('[Buy] Confirm result:', result, mwaResult.signature);
                  setBuyError(
                    result === 'failed'
                      ? 'Buy transaction failed on-chain.'
                      : 'Buy submitted but not confirmed yet. Check Solscan.'
                  );
                }
              })
              .catch((err) => console.warn('[Buy] Background confirm error:', err));

            return;
          }
        } catch (mwaErr: any) {
          console.warn('[Buy] MWA error:', mwaErr);
          const customMsg = mwaErr?.message;
          setBuyError(
            customMsg && !customMsg.includes('canceled')
              ? customMsg
              : 'Wallet signing was canceled or rejected.'
          );
          setIsBuying(false);
          return;
        }
      } else {
        // ─── Demo Mode: Simulated instant execution ────────────────────────
        await new Promise((r) => setTimeout(r, 600));
        const ok = buyStock(stock.id, amount);
        if (ok) {
          setSuccessSig('demo_buy_' + Date.now().toString().slice(-8));
          setTimeout(() => {
            setSuccessSig(null);
            setIsBuying(false);
            onClose();
          }, 1200);
          return;
        }
      }
    } catch (err: any) {
      setBuyError(err?.message || 'Purchase failed.');
    } finally {
      setIsBuying(false);
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
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={styles.title}>Buy {stock.tokenTicker}</Text>
                  <View style={[styles.modeTag, { backgroundColor: isLive ? (isDevnet ? '#EDE9FE' : '#DCFCE7') : '#F3F4F6' }]}>
                    <Text style={[styles.modeTagText, { color: isLive ? (isDevnet ? '#7C3AED' : '#16A34A') : '#6B7280' }]}>
                      {isLive ? (isDevnet ? 'DEVNET' : 'LIVE JUPITER') : 'DEMO'}
                    </Text>
                  </View>
                </View>
                <Text style={styles.subtitle}>{stock.name}</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <X size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>

          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>Current Market Price:</Text>
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
            <Text style={styles.sharesLabel}>Estimated Shares to Receive:</Text>
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

          {/* Error Banner */}
          {buyError && (
            <View style={styles.errorBanner}>
              <ShieldAlert size={14} color="#DC2626" style={{ marginRight: 6 }} />
              <Text style={styles.errorBannerText}>{buyError}</Text>
            </View>
          )}

          {/* Success Banner */}
          {successSig && (
            <View style={styles.successBanner}>
              <Check size={16} color="#16A34A" style={{ marginRight: 6 }} />
              <Text style={styles.successBannerText}>
                Purchased! Sig: {shortenAddress(successSig, 4)}
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.buyBtn, (!amount || isBuying) && styles.buyBtnDisabled]}
            onPress={handleBuy}
            disabled={!amount || isBuying}
            activeOpacity={0.85}
          >
            {isBuying ? (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <RefreshCw size={18} color="#000000" style={{ marginRight: 8 }} />
                <Text style={styles.buyBtnText}>
                  {isLive ? 'Signing with Wallet...' : 'Executing Purchase...'}
                </Text>
              </View>
            ) : (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                {isLive && <Smartphone size={16} color="#000000" style={{ marginRight: 6 }} />}
                <Text style={styles.buyBtnText}>
                  {isLive
                    ? `Sign & Buy ${stock.tokenTicker} (${formatCurrency(amount)})`
                    : `Buy ${stock.tokenTicker} for ${formatCurrency(amount)}`}
                </Text>
              </View>
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
  buyBtnDisabled: {
    backgroundColor: '#E5E7EB',
  },
  buyBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#000000',
  },
  modeTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 8,
  },
  modeTagText: {
    fontSize: 10,
    fontWeight: '800',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    padding: 10,
    marginBottom: 14,
  },
  errorBannerText: {
    flex: 1,
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '600',
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 12,
    padding: 10,
    marginBottom: 14,
  },
  successBannerText: {
    flex: 1,
    fontSize: 12,
    color: '#16A34A',
    fontWeight: '700',
  },
});
