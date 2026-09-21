import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Switch,
  Modal,
  Pressable,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import {
  ArrowLeft,
  Wallet,
  Zap,
  Shield,
  Bell,
  Award,
  ChevronRight,
  Copy,
  Check,
  ExternalLink,
  Edit3,
  X,
  User,
  Image as ImageIcon,
  FlaskConical,
  Radio,
  AlertTriangle,
  RotateCcw,
  Compass,
  RefreshCw,
  Sliders,
  Smartphone,
  Sparkles,
} from 'lucide-react-native';
import { useStockStore } from '../store/useStockStore';
import { LiquidationStrategy } from '../types';
import { RadarWatermark } from '../components/RadarWatermark';
import { formatCurrency, shortenAddress } from '../utils/formatters';
import { useAppMode, AppMode } from '../contexts/AppModeContext';
import {
  openPhantomConnect,
  openSolflareConnect,
  mwaAuthorize,
  decodeMWAAddress,
  type Cluster,
} from '../services/wallet';
import type { Chain } from '@solana-mobile/mobile-wallet-adapter-protocol';

interface ProfileScreenProps {
  onBack: () => void;
  onOpenSettings?: () => void;
  onOpenRewards: () => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  onBack,
  onOpenSettings,
  onOpenRewards,
}) => {
  const {
    preferences,
    walletAddress,
    solBalance,
    usdcBalance,
    totalPortfolioValue,
    accumulatedStockBackUSD,
    xTokenPoints,
    updateUserProfile,
    setSameBrandBonusEnabled,
    setSmartRouting,
    setLiquidationStrategy,
    setNetwork,
    resetToDefaults,
    refreshLivePrices,
    syncRealBalances,
    isRefreshingPrices,
    isSyncingBalances,
    setWalletAddress,
  } = useStockStore();

  const { appMode, setAppMode, isLive, isDemo } = useAppMode();

  const [copied, setCopied] = useState(false);
  const [biometricsEnabled, setBiometricsEnabled] = useState(true);
  const [spendAlertsEnabled, setSpendAlertsEnabled] = useState(true);

  // Edit Profile Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editName, setEditName] = useState(preferences.userName);
  const [editAvatarUrl, setEditAvatarUrl] = useState(preferences.avatarUrl);

  // Wallet & Mode State
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [modalNetwork, setModalNetwork] = useState<'solana-devnet' | 'solana-mainnet'>(preferences.preferredNetwork);
  const [inputWalletAddress, setInputWalletAddress] = useState(walletAddress);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);
  const [resetMessage, setResetMessage] = useState(false);

  const handleCopy = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenEdit = () => {
    setEditName(preferences.userName);
    setEditAvatarUrl(preferences.avatarUrl);
    setIsEditModalOpen(true);
  };

  const handleSaveProfile = () => {
    updateUserProfile({
      userName: editName.trim() || preferences.userName,
      avatarUrl: editAvatarUrl.trim() || preferences.avatarUrl,
    });
    setIsEditModalOpen(false);
  };

  const handleReset = () => {
    resetToDefaults();
    setResetMessage(true);
    setTimeout(() => setResetMessage(false), 2500);
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

  const isDevnet = preferences.preferredNetwork === 'solana-devnet' && isLive;
  const isMainnet = preferences.preferredNetwork === 'solana-mainnet' && isLive;

  const handleSelectEnvironment = async (env: 'demo' | 'devnet' | 'mainnet') => {
    if (env === 'demo') {
      await setAppMode('demo');
      resetToDefaults();
      setStatusNotice('Switched to Demo Sandbox');
      setTimeout(() => setStatusNotice(null), 2500);
    } else if (env === 'devnet') {
      setNetwork('solana-devnet');
      setModalNetwork('solana-devnet');
      await setAppMode('live');
      if (walletAddress) await syncRealBalances({ address: walletAddress, cluster: 'devnet' });
      setStatusNotice('Switched to Solana Devnet');
      setTimeout(() => setStatusNotice(null), 2500);
    } else if (env === 'mainnet') {
      setNetwork('solana-mainnet');
      setModalNetwork('solana-mainnet');
      await setAppMode('live');
      if (walletAddress) await syncRealBalances({ address: walletAddress, cluster: 'mainnet-beta' });
      setStatusNotice('Switched to Solana Mainnet');
      setTimeout(() => setStatusNotice(null), 2500);
    }
  };

  const handleConnectSeekerMWA = async () => {
    setStatusNotice('Opening Solana Mobile Wallet Adapter...');
    try {
      const targetCluster: 'mainnet-beta' | 'devnet' = modalNetwork === 'solana-mainnet' ? 'mainnet-beta' : 'devnet';
      const chain = (targetCluster === 'mainnet-beta' ? 'solana:mainnet' : 'solana:devnet') as Chain;
      const auth = await mwaAuthorize(chain);
      if (auth && auth.accounts && auth.accounts.length > 0) {
        const rawAddr = auth.accounts[0].address;
        const addr = decodeMWAAddress(rawAddr);
        if (addr && addr.length >= 32) {
          setNetwork(modalNetwork);
          await setAppMode('live');
          setWalletAddress(addr);
          setInputWalletAddress(addr);
          setShowWalletModal(false);
          setStatusNotice(`Linked: ${shortenAddress(addr, 4)}. Fetching on-chain balances on ${targetCluster}...`);
          await syncRealBalances({ address: addr, cluster: targetCluster });
          setStatusNotice(`Linked: ${shortenAddress(addr, 4)} — Balances synced!`);
          setTimeout(() => setStatusNotice(null), 3500);
          return;
        }
      }
      setStatusNotice('Wallet authorized, but no address was returned.');
      setTimeout(() => setStatusNotice(null), 3000);
    } catch (err: any) {
      console.warn('[MWA] Connect error:', err);
      const rawMsg = err?.message || '';
      const msg = rawMsg && rawMsg !== 'null' ? rawMsg : 'Wallet connection canceled or not supported.';
      setStatusNotice(msg);
      setTimeout(() => setStatusNotice(null), 4000);
    }
  };

  const handleQuickDevnetWallet = async () => {
    const devnetAddr = '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosg4B9';
    setNetwork('solana-devnet');
    setModalNetwork('solana-devnet');
    await setAppMode('live');
    setWalletAddress(devnetAddr);
    setInputWalletAddress(devnetAddr);
    setShowWalletModal(false);
    setStatusNotice('Devnet test wallet linked! Syncing on-chain balances...');
    await syncRealBalances({ address: devnetAddr, cluster: 'devnet' });
    setStatusNotice('Devnet balances synced!');
    setTimeout(() => setStatusNotice(null), 3000);
  };

  const handleSaveCustomWallet = async () => {
    const clean = decodeMWAAddress(inputWalletAddress.trim()) || inputWalletAddress.trim();
    if (clean.length >= 32 && clean.length <= 44) {
      const targetCluster: 'mainnet-beta' | 'devnet' = modalNetwork === 'solana-mainnet' ? 'mainnet-beta' : 'devnet';
      setNetwork(modalNetwork);
      await setAppMode('live');
      setWalletAddress(clean);
      setShowWalletModal(false);
      setStatusNotice(`Syncing ${targetCluster === 'devnet' ? 'Devnet' : 'Mainnet'} balances for ${shortenAddress(clean, 4)}...`);
      await syncRealBalances({ address: clean, cluster: targetCluster });
      setStatusNotice(`Real on-chain balances updated on ${targetCluster === 'devnet' ? 'Devnet' : 'Mainnet'}!`);
      setTimeout(() => setStatusNotice(null), 3000);
    } else {
      setStatusNotice('Please enter a valid Solana public key (32-44 characters).');
      setTimeout(() => setStatusNotice(null), 3000);
    }
  };

  const handleRefreshLive = async () => {
    setStatusNotice('Fetching real-time oracle prices & balances...');
    await refreshLivePrices();
    await syncRealBalances();
    setStatusNotice('Oracle prices & balances updated!');
    setTimeout(() => setStatusNotice(null), 2500);
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

  const presetAvatars = [
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80',
  ];

  return (
    <View style={styles.container}>
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

            {/* Solana Mobile / MWA Option (Works with Phantom, Solflare, Seeker) */}
            <TouchableOpacity style={styles.walletOptionBtn} onPress={handleConnectSeekerMWA} activeOpacity={0.85}>
              <View style={[styles.walletOptionIconBox, { backgroundColor: '#14F19520' }]}>
                <Smartphone size={20} color="#14F195" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.walletOptionTitle}>Connect via Wallet App (MWA)</Text>
                <Text style={styles.walletOptionDesc}>Auto-detects Phantom, Solflare, or Seeker</Text>
              </View>
              <Zap size={16} color="#14F195" />
            </TouchableOpacity>

            {/* Devnet Seeded Test Wallet Option */}
            <TouchableOpacity style={[styles.walletOptionBtn, { marginTop: 8 }]} onPress={handleQuickDevnetWallet} activeOpacity={0.85}>
              <View style={[styles.walletOptionIconBox, { backgroundColor: '#8B5CF620' }]}>
                <Sparkles size={20} color="#8B5CF6" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.walletOptionTitle}>Quick Devnet Test Wallet</Text>
                <Text style={styles.walletOptionDesc}>Instant mock funded address (7xKX...4B9)</Text>
              </View>
              <Check size={16} color="#8B5CF6" />
            </TouchableOpacity>

            {/* Network Selector for Direct Linking */}
            <Text style={[styles.inputLabel, { marginTop: 16 }]}>Target Solana Network</Text>
            <View style={styles.modalNetworkRow}>
              <TouchableOpacity
                style={[
                  styles.modalNetworkChip,
                  modalNetwork === 'solana-devnet' && styles.modalNetworkChipActiveDevnet,
                ]}
                onPress={() => setModalNetwork('solana-devnet')}
                activeOpacity={0.8}
              >
                <View style={[styles.networkDot, { backgroundColor: '#8B5CF6' }]} />
                <Text
                  style={[
                    styles.modalNetworkChipText,
                    modalNetwork === 'solana-devnet' && { color: '#6D28D9', fontWeight: '800' },
                  ]}
                >
                  🟣 Devnet
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalNetworkChip,
                  modalNetwork === 'solana-mainnet' && styles.modalNetworkChipActiveMainnet,
                ]}
                onPress={() => setModalNetwork('solana-mainnet')}
                activeOpacity={0.8}
              >
                <View style={[styles.networkDot, { backgroundColor: '#10B981' }]} />
                <Text
                  style={[
                    styles.modalNetworkChipText,
                    modalNetwork === 'solana-mainnet' && { color: '#047857', fontWeight: '800' },
                  ]}
                >
                  🟢 Mainnet Beta
                </Text>
              </TouchableOpacity>
            </View>

            {/* Direct Address Input */}
            <Text style={[styles.inputLabel, { marginTop: 14 }]}>Solana Public Key / Address</Text>
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
              <Text style={styles.saveWalletBtnText}>
                {`Link Address & Sync ${modalNetwork === 'solana-devnet' ? 'Devnet' : 'Mainnet'} Balances`}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ─── Edit Profile Modal ────────────────────────────────────── */}
      <Modal visible={isEditModalOpen} transparent animationType="slide" onRequestClose={() => setIsEditModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.editSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <TouchableOpacity style={styles.closeBtn} onPress={() => setIsEditModalOpen(false)}>
                <X size={18} color="#6B7280" />
              </TouchableOpacity>
            </View>

            {/* Avatar Preview & Selector */}
            <View style={styles.avatarPickerSection}>
              <Image source={{ uri: editAvatarUrl || preferences.avatarUrl }} style={styles.avatarPreview} />
              <Text style={styles.avatarPickerLabel}>Choose Avatar Preset:</Text>
              <View style={styles.avatarPresetRow}>
                {presetAvatars.map((url, idx) => (
                  <TouchableOpacity
                    key={idx}
                    onPress={() => setEditAvatarUrl(url)}
                    style={[
                      styles.presetAvatarWrapper,
                      editAvatarUrl === url && styles.presetAvatarSelected,
                    ]}
                  >
                    <Image source={{ uri: url }} style={styles.presetAvatarThumb} />
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Name Input */}
            <Text style={styles.inputLabel}>Display Name</Text>
            <View style={styles.inputWrapper}>
              <User size={16} color="#6B7280" style={{ marginRight: 8 }} />
              <TextInput
                style={styles.textInput}
                value={editName}
                onChangeText={setEditName}
                placeholder="Enter your name"
                placeholderTextColor="#9CA3AF"
              />
            </View>

            {/* Custom Avatar URL */}
            <Text style={[styles.inputLabel, { marginTop: 14 }]}>Custom Avatar Image URL</Text>
            <View style={styles.inputWrapper}>
              <ImageIcon size={16} color="#6B7280" style={{ marginRight: 8 }} />
              <TextInput
                style={styles.textInput}
                value={editAvatarUrl}
                onChangeText={setEditAvatarUrl}
                placeholder="https://..."
                placeholderTextColor="#9CA3AF"
              />
            </View>

            {/* Save Button */}
            <TouchableOpacity style={styles.saveBtn} onPress={handleSaveProfile} activeOpacity={0.85}>
              <Text style={styles.saveBtnText}>Save Profile Changes</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Navigation Bar */}
        <View style={styles.navBar}>
          <TouchableOpacity style={styles.backBtn} onPress={onBack} activeOpacity={0.7}>
            <ArrowLeft size={20} color="#111827" />
          </TouchableOpacity>
          <Text style={styles.navTitle}>Profile & Preferences</Text>
          <View style={{ width: 38 }} />
        </View>

        {/* Profile Card Header */}
        <View style={styles.profileHeaderCard}>
          <RadarWatermark
            size={180}
            color="rgba(198, 255, 0, 0.08)"
            style={{ right: -25, top: -20 }}
          />

          <View style={styles.avatarWrapper}>
            <Image source={{ uri: preferences.avatarUrl }} style={styles.avatarLarge} />
            <View style={styles.tierBadge}>
              <Zap size={12} color="#000000" fill="#000000" />
            </View>
          </View>

          <Text style={styles.userName}>{preferences.userName}</Text>
          <Text style={styles.userHandle}>@{preferences.userName.toLowerCase()}_sol • Solana Pro</Text>

          {/* Edit Profile Button */}
          <TouchableOpacity style={styles.editProfileBtn} onPress={handleOpenEdit} activeOpacity={0.8}>
            <Edit3 size={13} color="#141416" style={{ marginRight: 5 }} />
            <Text style={styles.editProfileBtnText}>Edit Profile</Text>
          </TouchableOpacity>

          {/* Quick Stats Banner */}
          <View style={styles.quickStatsRow}>
            <View style={styles.quickStatCol}>
              <Text style={styles.statLabel}>Portfolio</Text>
              <Text style={styles.statVal}>{formatCurrency(totalPortfolioValue)}</Text>
            </View>
            <View style={styles.statDivider} />
            <TouchableOpacity style={styles.quickStatCol} onPress={onOpenRewards} activeOpacity={0.7}>
              <Text style={styles.statLabel}>StockBack™</Text>
              <Text style={styles.statValLime}>{formatCurrency(accumulatedStockBackUSD)}</Text>
            </TouchableOpacity>
            <View style={styles.statDivider} />
            <TouchableOpacity style={styles.quickStatCol} onPress={onOpenRewards} activeOpacity={0.7}>
              <Text style={styles.statLabel}>xToken Pts</Text>
              <Text style={styles.statVal}>{xTokenPoints.toLocaleString()}</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ─── App Mode Switcher (Demo vs Live) ───────────────────── */}
        {/* ─── Unified App Environment Selector (Demo / Devnet / Mainnet) ────── */}
        <Text style={styles.sectionHeading}>App Environment & Network</Text>
        <View style={styles.modeCard}>
          {/* 1. Demo Sandbox */}
          <TouchableOpacity
            style={[styles.modeOption, isDemo && styles.modeOptionActive]}
            onPress={() => handleSelectEnvironment('demo')}
            activeOpacity={0.85}
          >
            <View style={[styles.modeIconCircle, isDemo && styles.modeIconCircleActive]}>
              <FlaskConical size={18} color={isDemo ? '#141416' : '#9CA3AF'} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.modeTitle, isDemo && styles.modeTitleActive]}>Demo Sandbox</Text>
              <Text style={[styles.modeDesc, isDemo && styles.modeDescActive]}>
                Safe mock simulation — test all features risk-free
              </Text>
            </View>
            <View style={[styles.modeRadio, isDemo && styles.modeRadioActive]}>
              {isDemo && <View style={styles.modeRadioInner} />}
            </View>
          </TouchableOpacity>

          <View style={styles.modeDivider} />

          {/* 2. Solana Devnet */}
          <TouchableOpacity
            style={[styles.modeOption, isDevnet && styles.modeOptionActiveDevnet]}
            onPress={() => handleSelectEnvironment('devnet')}
            activeOpacity={0.85}
          >
            <View style={[styles.modeIconCircle, isDevnet && styles.modeIconCircleDevnet]}>
              <Sparkles size={18} color={isDevnet ? '#6D28D9' : '#9CA3AF'} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.modeTitle, isDevnet && styles.modeTitleActiveDevnet]}>Solana Devnet</Text>
              <Text style={[styles.modeDesc, isDevnet && styles.modeDescActive]}>
                Test real on-chain SPL tokens & SOL with free faucet
              </Text>
            </View>
            <View style={[styles.modeRadio, isDevnet && styles.modeRadioActiveDevnet]}>
              {isDevnet && <View style={styles.modeRadioInnerDevnet} />}
            </View>
          </TouchableOpacity>

          <View style={styles.modeDivider} />

          {/* 3. Solana Mainnet */}
          <TouchableOpacity
            style={[styles.modeOption, isMainnet && styles.modeOptionActiveLive]}
            onPress={() => handleSelectEnvironment('mainnet')}
            activeOpacity={0.85}
          >
            <View style={[styles.modeIconCircle, isMainnet && styles.modeIconCircleLive]}>
              <Radio size={18} color={isMainnet ? '#141416' : '#9CA3AF'} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={[styles.modeTitle, isMainnet && styles.modeTitleActive]}>Solana Mainnet</Text>
              <Text style={[styles.modeDesc, isMainnet && styles.modeDescActive]}>
                Real Solana wallet + live Jupiter DEX swaps
              </Text>
            </View>
            <View style={[styles.modeRadio, isMainnet && styles.modeRadioActive]}>
              {isMainnet && <View style={styles.modeRadioInner} />}
            </View>
          </TouchableOpacity>
        </View>

        {isLive && (
          <View
            style={[
              styles.liveBanner,
              isDevnet && { backgroundColor: '#8B5CF620', borderColor: '#8B5CF640' },
            ]}
          >
            <Radio size={12} color={isDevnet ? '#8B5CF6' : '#C6FF00'} style={{ marginRight: 6 }} />
            <Text
              style={[
                styles.liveBannerText,
                isDevnet && { color: '#8B5CF6' },
              ]}
            >
              {isDevnet
                ? 'Devnet Mode active — connected to Solana Devnet'
                : 'Live Mode active — connected to Solana Mainnet Beta'}
            </Text>
          </View>
        )}

        {/* ─── Connected Solana Wallet Section ────────────────────── */}
        <Text style={styles.sectionHeading}>Solana Wallet & On-Chain Balances</Text>
        <View style={styles.walletCard}>
          <View style={styles.walletHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={styles.solanaCircle}>
                <Wallet size={18} color="#C6FF00" />
              </View>
              <View style={{ marginLeft: 10 }}>
                <Text style={styles.walletTitle}>Solana Wallet</Text>
                <TouchableOpacity style={styles.addrRow} onPress={handleCopy} activeOpacity={0.7}>
                  <Text style={styles.addrText}>{shortenAddress(walletAddress, 6)}</Text>
                  {copied ? <Check size={12} color="#C6FF00" /> : <Copy size={12} color="#9CA3AF" />}
                </TouchableOpacity>
              </View>
            </View>
            <View
              style={[
                styles.connectedBadge,
                isDevnet && { backgroundColor: '#8B5CF620' },
                isDemo && { backgroundColor: '#F59E0B20' },
              ]}
            >
              <Text
                style={[
                  styles.connectedBadgeText,
                  isDevnet && { color: '#8B5CF6' },
                  isDemo && { color: '#F59E0B' },
                ]}
              >
                {isDemo ? 'Demo' : isDevnet ? 'Devnet' : 'Live'}
              </Text>
            </View>
          </View>

          <View style={styles.balancesGrid}>
            <View style={styles.balCol}>
              <Text style={styles.balLabel}>SOL Balance</Text>
              <Text style={styles.balVal}>{solBalance.toFixed(3)} SOL</Text>
            </View>
            <View style={styles.balCol}>
              <Text style={styles.balLabel}>USDC Cash</Text>
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
                {isLive ? 'Connect / Switch Real Wallet →' : 'Link Solana Address →'}
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

        {/* ─── Auto-Liquidation Routing Strategy ─────────────────── */}
        <Text style={styles.sectionHeading}>Auto-Liquidation Routing Strategy</Text>
        <View style={styles.card}>
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

        {/* ─── Multipliers & Smart Routing Controls ──────────────── */}
        <Text style={styles.sectionHeading}>Multipliers & DEX Routing</Text>
        <View style={styles.card}>
          <View style={styles.switchRow}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Zap size={15} color="#C6FF00" fill="#C6FF00" style={{ marginRight: 5 }} />
                <Text style={styles.menuItemTitle}>1.5% Same-Brand Multiplier</Text>
              </View>
              <Text style={styles.menuItemSub}>
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

          <View style={styles.menuDivider} />

          <View style={styles.switchRow}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Compass size={15} color="#111827" style={{ marginRight: 5 }} />
                <Text style={styles.menuItemTitle}>Jupiter Smart Routing</Text>
              </View>
              <Text style={styles.menuItemSub}>
                Auto-route through lowest slippage pools across Solana DEXs
              </Text>
            </View>
            <Switch
              value={preferences.smartRouting}
              onValueChange={setSmartRouting}
              trackColor={{ false: '#D1D5DB', true: '#C6FF00' }}
              thumbColor="#FFFFFF"
            />
          </View>
        </View>

        {/* ─── Security & Alerts ──────────────────────────────────── */}
        <Text style={styles.sectionHeading}>Security & Preferences</Text>
        <View style={styles.card}>
          <View style={styles.switchRow}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={styles.menuItemTitle}>Biometric Authentication</Text>
              <Text style={styles.menuItemSub}>Require Face ID / Fingerprint on payment</Text>
            </View>
            <Switch
              value={biometricsEnabled}
              onValueChange={setBiometricsEnabled}
              trackColor={{ false: '#D1D5DB', true: '#C6FF00' }}
              thumbColor="#FFFFFF"
            />
          </View>

          <View style={styles.menuDivider} />

          <View style={styles.switchRow}>
            <View style={{ flex: 1, paddingRight: 12 }}>
              <Text style={styles.menuItemTitle}>Spend & Reward Alerts</Text>
              <Text style={styles.menuItemSub}>Instant push notification on liquidations</Text>
            </View>
            <Switch
              value={spendAlertsEnabled}
              onValueChange={setSpendAlertsEnabled}
              trackColor={{ false: '#D1D5DB', true: '#C6FF00' }}
              thumbColor="#FFFFFF"
            />
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

        {/* Version Footer */}
        <View style={styles.footer}>
          <Text style={styles.versionText}>xSpend v1.0.0 (Solana Mainnet/Devnet)</Text>
          <Text style={styles.buildText}>Decentralized Spend-from-Stocks Protocol</Text>
        </View>
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
  navBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  navTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },

  // ─── Profile Header Card ──────────────────────────────────────────────────
  profileHeaderCard: {
    backgroundColor: '#141416',
    borderRadius: 26,
    padding: 22,
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
    marginBottom: 18,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: 12,
  },
  avatarLarge: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 3,
    borderColor: '#C6FF00',
  },
  tierBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#C6FF00',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#141416',
  },
  userName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  userHandle: {
    fontSize: 12.5,
    color: '#9CA3AF',
    marginTop: 2,
  },
  editProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#C6FF00',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 12,
    marginTop: 10,
  },
  editProfileBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#141416',
  },
  quickStatsRow: {
    flexDirection: 'row',
    backgroundColor: '#1F1F23',
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 18,
    width: '100%',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  quickStatCol: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#374151',
  },
  statLabel: {
    fontSize: 10.5,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  statVal: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 2,
  },
  statValLime: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#C6FF00',
    marginTop: 2,
  },

  // ─── Sections ─────────────────────────────────────────────────────────────
  sectionHeading: {
    fontSize: 14,
    fontWeight: '800',
    color: '#374151',
    marginTop: 10,
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
    marginBottom: 12,
  },
  modeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  modeOptionActive: {
    backgroundColor: 'rgba(245, 158, 11, 0.08)',
    borderWidth: 2,
    borderColor: '#F59E0B',
    borderRadius: 20,
    margin: 4,
  },
  modeOptionActiveDevnet: {
    backgroundColor: 'rgba(139, 92, 246, 0.08)',
    borderWidth: 2,
    borderColor: '#8B5CF6',
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
    backgroundColor: '#FEF3C7',
  },
  modeIconCircleDevnet: {
    backgroundColor: '#EDE9FE',
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
  modeTitleActiveDevnet: {
    color: '#6D28D9',
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
    borderColor: '#F59E0B',
  },
  modeRadioActiveDevnet: {
    borderColor: '#8B5CF6',
  },
  modeRadioInner: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#111827',
  },
  modeRadioInnerDevnet: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#8B5CF6',
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
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 12,
  },
  liveBannerText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#C6FF00',
  },

  // ─── Wallet Card (Dark) ───────────────────────────────────────────────────
  walletCard: {
    backgroundColor: '#141416',
    borderRadius: 24,
    padding: 18,
    marginBottom: 14,
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
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  addrRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  addrText: {
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#9CA3AF',
    marginRight: 6,
  },
  connectedBadge: {
    backgroundColor: '#27272A',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  connectedBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#C6FF00',
  },
  balancesGrid: {
    flexDirection: 'row',
    backgroundColor: '#1F1F23',
    borderRadius: 16,
    padding: 14,
  },
  balCol: {
    flex: 1,
  },
  balLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  balVal: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    marginTop: 2,
  },
  noticeBanner: {
    backgroundColor: '#27272A',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 10,
  },
  noticeText: {
    fontSize: 11.5,
    color: '#C6FF00',
    fontWeight: '600',
    textAlign: 'center',
  },
  connectBtn: {
    backgroundColor: '#27272A',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 8,
  },
  connectBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  refreshBtn: {
    backgroundColor: 'rgba(198, 255, 0, 0.12)',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(198, 255, 0, 0.3)',
  },
  refreshBtnText: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#C6FF00',
  },

  // ─── General Card ─────────────────────────────────────────────────────────
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 16,
    marginBottom: 14,
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
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  menuItemTitle: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#111827',
  },
  menuItemSub: {
    fontSize: 11.5,
    color: '#6B7280',
    marginTop: 2,
    lineHeight: 16,
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 12,
  },

  // ─── Liquidation Strategies ───────────────────────────────────────────────
  stratOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  stratBorder: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingBottom: 12,
    marginBottom: 6,
  },
  stratRadio: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioOuterSelected: {
    borderColor: '#111827',
  },
  radioInner: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: '#111827',
  },
  stratLabel: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#6B7280',
  },
  stratLabelSelected: {
    color: '#111827',
  },
  stratDesc: {
    fontSize: 11.5,
    color: '#9CA3AF',
    marginTop: 2,
  },

  // ─── Network Selector ─────────────────────────────────────────────────────
  networkRow: {
    flexDirection: 'row',
    gap: 8,
  },
  networkBtn: {
    flex: 1,
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  networkBtnActive: {
    backgroundColor: '#111827',
    borderColor: '#111827',
  },
  networkBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#6B7280',
  },
  networkBtnTextActive: {
    color: '#C6FF00',
  },

  // ─── Reset Button ─────────────────────────────────────────────────────────
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    borderRadius: 16,
    paddingVertical: 14,
    marginTop: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FEE2E2',
  },
  resetBtnText: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#DC2626',
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
    fontSize: 13.5,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 21,
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
    fontSize: 14.5,
    fontWeight: '800',
    color: '#141416',
  },
  warningCancelText: {
    fontSize: 13.5,
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
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  textInput: {
    flex: 1,
    fontSize: 13,
    color: '#111827',
    padding: 0,
  },
  modalNetworkRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 6,
  },
  modalNetworkChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
  },
  modalNetworkChipActiveDevnet: {
    backgroundColor: '#8B5CF615',
    borderColor: '#8B5CF6',
  },
  modalNetworkChipActiveMainnet: {
    backgroundColor: '#10B98115',
    borderColor: '#10B981',
  },
  modalNetworkChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginLeft: 6,
  },
  networkDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
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

  // ─── Edit Profile Modal ───────────────────────────────────────────────────
  editSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 36,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
  },
  avatarPickerSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarPreview: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 3,
    borderColor: '#C6FF00',
    marginBottom: 10,
  },
  avatarPickerLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
  },
  avatarPresetRow: {
    flexDirection: 'row',
  },
  presetAvatarWrapper: {
    padding: 2,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: 'transparent',
    marginHorizontal: 4,
  },
  presetAvatarSelected: {
    borderColor: '#111827',
  },
  presetAvatarThumb: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  saveBtn: {
    backgroundColor: '#C6FF00',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#141416',
  },

  // ─── Footer ───────────────────────────────────────────────────────────────
  footer: {
    alignItems: 'center',
    marginTop: 6,
    marginBottom: 20,
  },
  versionText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#9CA3AF',
  },
  buildText: {
    fontSize: 10.5,
    color: '#D1D5DB',
    marginTop: 2,
  },
});
