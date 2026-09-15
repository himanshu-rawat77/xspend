import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Modal,
  Pressable,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import {
  Wallet,
  Zap,
  RotateCcw,
  Copy,
  Check,
  FlaskConical,
  Radio,
  AlertTriangle,
  X,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react-native';
import { useStockStore } from '../store/useStockStore';
import { LiquidationStrategy } from '../types';
import { shortenAddress, formatCurrency } from '../utils/formatters';
import { useAppMode, AppMode } from '../contexts/AppModeContext';
import {
  detectAndConnect,
  openPhantomConnect,
  openSolflareConnect,
  getConnection,
  fetchSOLBalance,
} from '../services/wallet';

export const SettingsScreen: React.FC = () => {
  const {
    walletAddress,
    solBalance,
    usdcBalance,
    preferences,
    setSameBrandBonusEnabled,
    setLiquidationStrategy,
    setNetwork,
    resetToDefaults,
    refreshLivePrices,
    syncRealBalances,
    isRefreshingPrices,
    isSyncingBalances,
    setWalletAddress,
    setSolBalance,
  } = useStockStore();

  const { appMode, setAppMode } = useAppMode();

  const [copied, setCopied] = useState(false);
  const [resetMessage, setResetMessage] = useState(false);
  const [showLiveWarning, setShowLiveWarning] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [inputWalletAddress, setInputWalletAddress] = useState(walletAddress);
  const [pendingMode, setPendingMode] = useState<AppMode | null>(null);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  const handleCopy = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReset = () => {
    resetToDefaults();
    setResetMessage(true);
    setTimeout(() => setResetMessage(false), 2000);
  };

  const handleOpenPhantom = async () => {
    setStatusNotice('Opening Phantom...');
    await openPhantomConnect();
    setTimeout(() => setStatusNotice(null), 2500);
  };

  const handleOpenSolflare = async () => {
    setStatusNotice('Opening Solflare...');
    await openSolflareConnect();
    setTimeout(() => setStatusNotice(null), 2500);
  };

  const handleSaveCustomWallet = async () => {
    const clean = inputWalletAddress.trim();
    if (clean.length >= 32 && clean.length <= 44) {
      setWalletAddress(clean);
      setShowWalletModal(false);
      setStatusNotice('Wallet linked! Syncing balances...');
      await syncRealBalances();
      setStatusNotice('Real on-chain balances updated!');
      setTimeout(() => setStatusNotice(null), 3000);
    } else {
      setStatusNotice('Please enter a valid Solana public key (32-44 characters).');
      setTimeout(() => setStatusNotice(null), 3000);
    }
  };

  const handleRefreshLive = async () => {
    setStatusNotice('Fetching real-time oracle prices...');
    await refreshLivePrices();
    await syncRealBalances();
    setStatusNotice('Real-time prices & balances updated!');
    setTimeout(() => setStatusNotice(null), 2500);
  };

  const handleModePress = (mode: AppMode) => {
    if (mode === appMode) return;
    if (mode === 'live') {
      setPendingMode('live');
      setShowLiveWarning(true);
    } else {
      setAppMode('demo');
    }
  };

  const confirmSwitchToLive = async () => {
    setShowLiveWarning(false);
    await setAppMode('live');
    setPendingMode(null);
  };

  const cancelSwitch = () => {
    setShowLiveWarning(false);
    setPendingMode(null);
  };

  const strategies: { key: LiquidationStrategy; label: string; desc: string }[] = [
    {
      key: 'same_brand_first',
      label: '⚡ Same Brand First (Recommended)',
      desc: 'Liquidates matching brand stock first to trigger the 1.5% reward bonus',
    },
    {
      key: 'highest_gain',
      label: '📈 Highest Profit First',
      desc: 'Liquidates stock with highest 24h gain to lock in profits',
    },
    {
      key: 'lowest_volatility',
      label: '🛡️ Lowest Volatility',
      desc: 'Liquidates stock with most stable price action',
    },
  ];

  const isDemo = appMode === 'demo';
  const isLive = appMode === 'live';

  return (
    <View style={styles.container}>
      {/* ─── Live Mode Warning Modal ──────────────────────────────── */}
      <Modal visible={showLiveWarning} transparent animationType="fade">
        <Pressable style={styles.modalBackdrop} onPress={cancelSwitch}>
          <View style={styles.warningModal}>
            <View style={styles.warningIconCircle}>
              <AlertTriangle size={28} color="#F59E0B" />
            </View>
            <Text style={styles.warningTitle}>Switch to Live Mode?</Text>
            <Text style={styles.warningBody}>
              Live Mode connects to a{'\n'}real Solana wallet and uses{'\n'}real Jupiter swaps.{'\n\n'}
              <Text style={styles.warningBold}>Real funds will be at risk.</Text>
              {'\n'}Only proceed if you understand{'\n'}the risks involved.
            </Text>
            <TouchableOpacity
              style={styles.warningConfirmBtn}
              onPress={confirmSwitchToLive}
              activeOpacity={0.85}
            >
              <Text style={styles.warningConfirmText}>Yes, Switch to Live</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={cancelSwitch} activeOpacity={0.7} style={{ marginTop: 12 }}>
              <Text style={styles.warningCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {/* ─── Connect Real Wallet Modal ────────────────────────────── */}
      <Modal visible={showWalletModal} transparent animationType="slide" onRequestClose={() => setShowWalletModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.walletSheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Connect Solana Wallet</Text>
              <TouchableOpacity style={styles.closeBtn} onPress={() => setShowWalletModal(false)}>
                <X size={18} color="#6B7280" />
              </TouchableOpacity>
            </View>

            <Text style={styles.sheetSub}>
              Choose your wallet app or enter your Solana public key to sync real SPL balances.
            </Text>

            {/* Phantom Option */}
            <TouchableOpacity style={styles.walletOptionBtn} onPress={handleOpenPhantom} activeOpacity={0.85}>
              <View style={styles.walletOptionIconBox}>
                <Wallet size={20} color="#AB9FF2" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.walletOptionTitle}>Phantom Wallet</Text>
                <Text style={styles.walletOptionDesc}>Open Phantom mobile app</Text>
              </View>
              <ExternalLink size={16} color="#9CA3AF" />
            </TouchableOpacity>

            {/* Solflare Option */}
            <TouchableOpacity style={[styles.walletOptionBtn, { marginTop: 8 }]} onPress={handleOpenSolflare} activeOpacity={0.85}>
              <View style={styles.walletOptionIconBox}>
                <Wallet size={20} color="#FC814A" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.walletOptionTitle}>Solflare Wallet</Text>
                <Text style={styles.walletOptionDesc}>Open Solflare mobile app</Text>
              </View>
              <ExternalLink size={16} color="#9CA3AF" />
            </TouchableOpacity>

            {/* Direct Address Input */}
            <Text style={[styles.inputLabel, { marginTop: 16 }]}>Or Enter Solana Address / Public Key</Text>
            <View style={styles.inputWrapper}>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. 7xKXtg...Josg4B9"
                placeholderTextColor="#9CA3AF"
                value={inputWalletAddress}
                onChangeText={setInputWalletAddress}
                autoCapitalize="none"
              />
            </View>

            <TouchableOpacity style={styles.saveWalletBtn} onPress={handleSaveCustomWallet} activeOpacity={0.85}>
              <Text style={styles.saveWalletBtnText}>Link Address & Sync Balances</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Settings & Wallet</Text>
          <Text style={styles.subtitle}>Solana Spend Preferences & Network Setup</Text>
        </View>

        {/* ─── App Mode Switcher ─────────────────────────────────── */}
        <Text style={styles.sectionHeading}>App Mode</Text>
        <View style={styles.modeCard}>
          {/* Demo Mode */}
          <TouchableOpacity
            style={[styles.modeOption, isDemo && styles.modeOptionActive]}
            onPress={() => handleModePress('demo')}
            activeOpacity={0.85}
          >
            <View style={[styles.modeIconCircle, isDemo && styles.modeIconCircleActive]}>
              <FlaskConical size={18} color={isDemo ? '#141416' : '#9CA3AF'} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.modeTitle, isDemo && styles.modeTitleActive]}>Demo Mode</Text>
              <Text style={[styles.modeDesc, isDemo && styles.modeDescActive]}>
                Safe mock data — no real funds
              </Text>
            </View>
            <View style={[styles.modeRadio, isDemo && styles.modeRadioActive]}>
              {isDemo && <View style={styles.modeRadioInner} />}
            </View>
          </TouchableOpacity>

          <View style={styles.modeDivider} />

          {/* Live Mode */}
          <TouchableOpacity
            style={[styles.modeOption, isLive && styles.modeOptionActiveLive]}
            onPress={() => handleModePress('live')}
            activeOpacity={0.85}
          >
            <View style={[styles.modeIconCircle, isLive && styles.modeIconCircleLive]}>
              <Radio size={18} color={isLive ? '#141416' : '#9CA3AF'} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.modeTitle, isLive && styles.modeTitleActive]}>Live Mode</Text>
              <Text style={[styles.modeDesc, isLive && styles.modeDescActive]}>
                Real Solana wallet + Jupiter swaps
              </Text>
            </View>
            <View style={[styles.modeRadio, isLive && styles.modeRadioActive]}>
              {isLive && <View style={styles.modeRadioInner} />}
            </View>
          </TouchableOpacity>
        </View>

        {isLive && (
          <View style={styles.liveBanner}>
            <Radio size={12} color="#C6FF00" style={{ marginRight: 6 }} />
            <Text style={styles.liveBannerText}>
              Live Mode active — real Solana transactions enabled
            </Text>
          </View>
        )}

        {/* ─── Connected Solana Wallet Card ─────────────────────── */}
        <View style={styles.walletCard}>
          <View style={styles.walletHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={styles.solanaCircle}>
                <Wallet size={18} color="#C6FF00" />
              </View>
              <View style={{ marginLeft: 10 }}>
                <Text style={styles.walletTitle}>Phantom / Solana Wallet</Text>
                <TouchableOpacity style={styles.addrRow} onPress={handleCopy} activeOpacity={0.7}>
                  <Text style={styles.addrText}>{shortenAddress(walletAddress, 6)}</Text>
                  {copied ? <Check size={12} color="#C6FF00" /> : <Copy size={12} color="#9CA3AF" />}
                </TouchableOpacity>
              </View>
            </View>
            <View style={styles.connectedBadge}>
              <Text style={styles.connectedBadgeText}>{isDemo ? 'Demo' : 'Connected'}</Text>
            </View>
          </View>

          <View style={styles.balancesGrid}>
            <View style={styles.balCol}>
              <Text style={styles.balLabel}>SOL Balance</Text>
              <Text style={styles.balVal}>{solBalance.toFixed(3)} SOL</Text>
            </View>
            <View style={styles.balCol}>
              <Text style={styles.balLabel}>USDC Balance</Text>
              <Text style={styles.balVal}>{formatCurrency(usdcBalance)}</Text>
            </View>
          </View>

          {statusNotice && (
            <View style={styles.noticeBanner}>
              <Text style={styles.noticeText}>{statusNotice}</Text>
            </View>
          )}

          <View style={{ marginTop: 12 }}>
            <TouchableOpacity
              style={styles.connectBtn}
              onPress={() => setShowWalletModal(true)}
              activeOpacity={0.85}
            >
              <Text style={styles.connectBtnText}>
                {isLive ? 'Connect / Change Real Wallet →' : 'Link Solana Address →'}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.refreshBtn}
              onPress={handleRefreshLive}
              activeOpacity={0.85}
              disabled={isRefreshingPrices || isSyncingBalances}
            >
              <Text style={styles.refreshBtnText}>
                {isRefreshingPrices || isSyncingBalances ? 'Syncing On-Chain Data...' : '⚡ Sync Live Oracle Prices & Balances'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ─── Reward Multiplier Toggle ──────────────────────────── */}
        <View style={styles.sectionCard}>
          <View style={styles.switchRow}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Zap size={16} color="#C6FF00" fill="#C6FF00" />
                <Text style={styles.switchTitle}>1.5% Same-Brand Multiplier</Text>
              </View>
              <Text style={styles.switchDesc}>
                Earn an extra 50% reward boost when paying with the brand's tokenized stock
              </Text>
            </View>
            <Switch
              value={preferences.sameBrandBonusEnabled}
              onValueChange={setSameBrandBonusEnabled}
              trackColor={{ false: '#D1D5DB', true: '#C6FF00' }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* ─── Liquidation Strategy ─────────────────────────────── */}
        <Text style={styles.sectionHeading}>Auto-Liquidation Routing Strategy</Text>
        <View style={styles.sectionCard}>
          {strategies.map((strat, idx) => {
            const isSelected = preferences.liquidationStrategy === strat.key;
            return (
              <TouchableOpacity
                key={strat.key}
                style={[
                  styles.stratOption,
                  idx !== strategies.length - 1 && styles.stratBorder,
                ]}
                onPress={() => setLiquidationStrategy(strat.key)}
                activeOpacity={0.8}
              >
                <View style={styles.stratRadio}>
                  <View
                    style={[
                      styles.radioOuter,
                      isSelected && styles.radioOuterSelected,
                    ]}
                  >
                    {isSelected && <View style={styles.radioInner} />}
                  </View>
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text
                    style={[
                      styles.stratLabel,
                      isSelected && styles.stratLabelSelected,
                    ]}
                  >
                    {strat.label}
                  </Text>
                  <Text style={styles.stratDesc}>{strat.desc}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ─── Solana Network ─────────────────────────────────────── */}
        <Text style={styles.sectionHeading}>Solana Cluster</Text>
        <View style={styles.sectionCard}>
          <View style={styles.networkRow}>
            <TouchableOpacity
              style={[
                styles.networkBtn,
                preferences.preferredNetwork === 'solana-mainnet' && styles.networkBtnActive,
              ]}
              onPress={() => setNetwork('solana-mainnet')}
            >
              <Text
                style={[
                  styles.networkBtnText,
                  preferences.preferredNetwork === 'solana-mainnet' && styles.networkBtnTextActive,
                ]}
              >
                Mainnet Beta
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.networkBtn,
                preferences.preferredNetwork === 'solana-devnet' && styles.networkBtnActive,
              ]}
              onPress={() => setNetwork('solana-devnet')}
            >
              <Text
                style={[
                  styles.networkBtnText,
                  preferences.preferredNetwork === 'solana-devnet' && styles.networkBtnTextActive,
                ]}
              >
                Devnet Mock
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ─── Reset Demo Data ────────────────────────────────────── */}
        <TouchableOpacity
          style={styles.resetBtn}
          onPress={handleReset}
          activeOpacity={0.8}
        >
          <RotateCcw size={16} color="#DC2626" style={{ marginRight: 8 }} />
          <Text style={styles.resetBtnText}>
            {resetMessage ? 'Demo Data Restored!' : 'Reset Demo Balances & History'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 110,
  },
  header: {
    marginBottom: 14,
  },
  title: {
    fontSize: 22,
    fontWeight: '800',
    color: '#111827',
  },
  subtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  sectionHeading: {
    fontSize: 14,
    fontWeight: '800',
    color: '#374151',
    marginTop: 18,
    marginBottom: 8,
  },

  // ─── Mode Switcher ────────────────────────────────────────────────────────
  modeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#F1F3F5',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  modeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  modeOptionActive: {
    backgroundColor: 'rgba(198, 255, 0, 0.08)',
    borderWidth: 2,
    borderColor: '#C6FF00',
    borderRadius: 20,
    margin: 4,
  },
  modeOptionActiveLive: {
    backgroundColor: 'rgba(198, 255, 0, 0.08)',
    borderWidth: 2,
    borderColor: '#C6FF00',
    borderRadius: 20,
    margin: 4,
  },
  modeIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modeIconCircleActive: {
    backgroundColor: '#C6FF00',
  },
  modeIconCircleLive: {
    backgroundColor: '#C6FF00',
  },
  modeTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#6B7280',
  },
  modeTitleActive: {
    color: '#111827',
  },
  modeDesc: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 1,
  },
  modeDescActive: {
    color: '#4B5563',
  },
  modeRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modeRadioActive: {
    borderColor: '#111827',
  },
  modeRadioInner: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#111827',
  },
  modeDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginHorizontal: 16,
  },
  liveBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#141416',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginTop: 8,
  },
  liveBannerText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#C6FF00',
  },

  // ─── Warning Modal ────────────────────────────────────────────────────────
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  warningModal: {
    backgroundColor: '#FFFFFF',
    borderRadius: 28,
    padding: 28,
    alignItems: 'center',
    width: '100%',
  },
  warningIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  warningTitle: {
    fontSize: 19,
    fontWeight: '800',
    color: '#111827',
    marginBottom: 10,
    textAlign: 'center',
  },
  warningBody: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 22,
  },
  warningBold: {
    fontWeight: '800',
    color: '#DC2626',
  },
  warningConfirmBtn: {
    backgroundColor: '#C6FF00',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 32,
    width: '100%',
    alignItems: 'center',
  },
  warningConfirmText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#141416',
  },
  warningCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },

  // ─── Wallet Sheet Modal ───────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  walletSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 36,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  sheetSub: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 16,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  walletOptionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  walletOptionIconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#111827',
    justifyContent: 'center',
    alignItems: 'center',
  },
  walletOptionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  walletOptionDesc: {
    fontSize: 11.5,
    color: '#6B7280',
    marginTop: 1,
  },
  inputLabel: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 6,
  },
  inputWrapper: {
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  textInput: {
    fontSize: 13,
    color: '#111827',
    fontFamily: 'monospace',
    padding: 0,
  },
  saveWalletBtn: {
    backgroundColor: '#C6FF00',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 18,
  },
  saveWalletBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#141416',
  },

  // ─── Wallet Card ──────────────────────────────────────────────────────────
  walletCard: {
    backgroundColor: '#141416',
    borderRadius: 24,
    padding: 18,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 3,
  },
  walletHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  solanaCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#27272A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  walletTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  addrRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  addrText: {
    fontSize: 11.5,
    fontFamily: 'monospace',
    color: '#9CA3AF',
    marginRight: 6,
  },
  connectedBadge: {
    backgroundColor: 'rgba(198, 255, 0, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  connectedBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#C6FF00',
  },
  balancesGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#1F1F23',
    borderRadius: 16,
    padding: 12,
  },
  balCol: {
    flex: 1,
  },
  balLabel: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  balVal: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 2,
  },
  connectBtn: {
    backgroundColor: '#C6FF00',
    borderRadius: 14,
    paddingVertical: 11,
    alignItems: 'center',
    marginTop: 8,
  },
  connectBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#141416',
  },
  refreshBtn: {
    backgroundColor: '#27272A',
    borderRadius: 14,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#3F3F46',
  },
  refreshBtnText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#C6FF00',
  },
  noticeBanner: {
    backgroundColor: 'rgba(198, 255, 0, 0.12)',
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 10,
    alignItems: 'center',
  },
  noticeText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#C6FF00',
  },

  // ─── Section Cards ────────────────────────────────────────────────────────
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 16,
    marginVertical: 4,
    borderWidth: 1,
    borderColor: '#F1F3F5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  switchTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
    marginLeft: 6,
  },
  switchDesc: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
    lineHeight: 16,
  },
  stratOption: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
  },
  stratBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  stratRadio: {
    marginTop: 2,
  },
  radioOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioOuterSelected: {
    borderColor: '#111827',
  },
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#111827',
  },
  stratLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4B5563',
  },
  stratLabelSelected: {
    color: '#111827',
    fontWeight: '800',
  },
  stratDesc: {
    fontSize: 11.5,
    color: '#9CA3AF',
    marginTop: 2,
    lineHeight: 15,
  },
  networkRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  networkBtn: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    marginHorizontal: 4,
  },
  networkBtnActive: {
    backgroundColor: '#111827',
  },
  networkBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4B5563',
  },
  networkBtnTextActive: {
    color: '#FFFFFF',
  },
  resetBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FEE2E2',
    borderRadius: 18,
    paddingVertical: 14,
    marginTop: 20,
  },
  resetBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#DC2626',
  },
});
