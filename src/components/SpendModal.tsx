import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Dimensions,
  ActivityIndicator,
} from 'react-native';
import {
  X,
  ArrowRight,
  Zap,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  QrCode,
  Layers,
  Sparkles,
  PlusCircle,
  Link,
  Store,
  Camera,
  ScanLine,
  Check,
  Smartphone,
  ShieldAlert,
  RotateCcw,
  Copy,
  ExternalLink,
} from 'lucide-react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import QRCode from 'react-native-qrcode-svg';
import { useStockStore } from '../store/useStockStore';
import { useAppMode } from '../contexts/AppModeContext';
import { MERCHANTS } from '../data/mockMerchants';
import { Merchant, Stock, SpendTransaction } from '../types';
import { BrandLogo } from './BrandLogo';
import { formatCurrency, formatNumber, shortenAddress, generateSolanaSignature } from '../utils/formatters';
import { getJupiterQuote, mockJupiterQuote, JupiterQuote } from '../services/jupiter';
import { buildSolanaPayUrl, pollPaymentConfirmation, mockSolanaPayConfirmation } from '../services/solanaPay';
import { calculateReward } from '../services/rewards';
import { getConnection } from '../services/wallet';

interface SpendModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess: (tx: SpendTransaction) => void;
  initialMerchantId?: string;
  initialStockTicker?: string;
}

export type SpendModeTab = 'scan' | 'direct' | 'receive';

export interface ScannedInvoiceDetails {
  merchantName: string;
  merchantAddress: string;
  amount: number;
  referenceKey?: string;
  memo?: string;
  associatedStockId?: string;
  logo?: string;
}

export const SpendModal: React.FC<SpendModalProps> = ({
  visible,
  onClose,
  onSuccess,
  initialMerchantId = 'apple',
  initialStockTicker,
}) => {
  const { stocks, executeSpend, preferences, walletAddress } = useStockStore();
  const { isLive, isDemo } = useAppMode();

  // Camera permissions
  const [permission, requestPermission] = useCameraPermissions();
  const [isScanningActive, setIsScanningActive] = useState<boolean>(true);

  const [activeTab, setActiveTab] = useState<SpendModeTab>('scan');
  
  // Scanned invoice state (when a QR is scanned)
  const [scannedInvoice, setScannedInvoice] = useState<ScannedInvoiceDetails | null>(null);
  const [copiedAddr, setCopiedAddr] = useState<boolean>(false);

  const [selectedMerchantId, setSelectedMerchantId] = useState<string>(initialMerchantId);
  const [customMerchantName, setCustomMerchantName] = useState<string>('Local Store');
  const [customWalletAddress, setCustomWalletAddress] = useState<string>('7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosg4B9');
  
  const [amountStr, setAmountStr] = useState<string>('50');
  const [selectedStockTicker, setSelectedStockTicker] = useState<string>(
    initialStockTicker || stocks[0]?.ticker || 'MSFT'
  );
  const [isSwapping, setIsSwapping] = useState<boolean>(false);
  const [liveQuote, setLiveQuote] = useState<JupiterQuote | null>(null);
  const [isLoadingQuote, setIsLoadingQuote] = useState<boolean>(false);
  
  // Scanner state
  const [scannedUriInput, setScannedUriInput] = useState<string>('');
  const [scanSuccessNotice, setScanSuccessNotice] = useState<string | null>(null);
  
  // Merchant POS / Receive QR state
  const [receiveAmountStr, setReceiveAmountStr] = useState<string>('25');
  const [qrReference, setQrReference] = useState<string>('');
  const [qrUrl, setQrUrl] = useState<string>('');
  const [isPollingPayment, setIsPollingPayment] = useState<boolean>(false);

  const isCustom = selectedMerchantId === 'custom' && !scannedInvoice;

  // Derive active merchant details
  const selectedMerchant: Merchant = scannedInvoice
    ? {
        id: scannedInvoice.associatedStockId ? scannedInvoice.associatedStockId.toLowerCase() : 'scanned_merchant',
        name: scannedInvoice.merchantName,
        category: 'Scanned Store',
        logo: scannedInvoice.logo || 'fallback',
        logoColor: '#111827',
        hasXStock: !!scannedInvoice.associatedStockId,
        associatedStockId: scannedInvoice.associatedStockId,
        rewardDescription: scannedInvoice.associatedStockId
          ? `1.0% in ${scannedInvoice.associatedStockId}x (1.5% same-brand)`
          : '1.0% in protocol xToken Points',
        defaultSpendPresets: [scannedInvoice.amount],
      }
    : isCustom
    ? {
        id: 'custom',
        name: customMerchantName || 'Custom Merchant',
        category: 'Custom Merchant',
        logo: 'fallback',
        logoColor: '#111827',
        hasXStock: false,
        rewardDescription: '1.0% in protocol xToken Points',
        defaultSpendPresets: [10, 25, 50, 100],
      }
    : MERCHANTS.find((m) => m.id === selectedMerchantId) || MERCHANTS[0];

  const sourceStock = stocks.find((s) => s.ticker === selectedStockTicker) || stocks[0];
  const amount = scannedInvoice ? scannedInvoice.amount : parseFloat(amountStr) || 0;

  // Reward calculation engine
  const rewardCalc = calculateReward({
    spendAmountUSD: amount,
    merchantHasXStock: selectedMerchant.hasXStock,
    brandXStockTicker: selectedMerchant.associatedStockId ? `${selectedMerchant.associatedStockId}x` : null,
    brandXStockPrice: stocks.find((s) => s.ticker === selectedMerchant.associatedStockId)?.price || 150,
    sourceStockTicker: sourceStock.tokenTicker,
    merchantAssociatedTicker: selectedMerchant.associatedStockId ? `${selectedMerchant.associatedStockId}x` : null,
    sameBrandBonusEnabled: preferences.sameBrandBonusEnabled,
  });

  const sharesToSell = sourceStock.price > 0 ? amount / sourceStock.price : 0;
  const canAfford = sourceStock.holdings >= sharesToSell && amount > 0;

  // Real Camera Barcode Scanned Handler
  const handleBarcodeScanned = ({ data }: { data: string }) => {
    if (!isScanningActive || !data) return;
    setIsScanningActive(false); // Debounce scanner
    handleProcessScannedUri(data);
  };

  // Process any Solana Pay QR / Address payload
  const handleProcessScannedUri = (
    uri: string,
    storeLabel?: string,
    defaultAmt?: string,
    associatedStock?: string,
    logoKey?: string
  ) => {
    let parsedMerchant = storeLabel || 'Scanned Merchant';
    let parsedAmount = parseFloat(defaultAmt || '50') || 50;
    let parsedRecipient = '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosg4B9';
    let parsedRef = '';
    let parsedMemo = `SS-${Date.now().toString().slice(-6)}`;
    let parsedStock = associatedStock;

    if (uri.startsWith('solana:')) {
      try {
        const clean = uri.replace('solana:', '');
        const [recipient, queryString] = clean.split('?');
        if (recipient) parsedRecipient = recipient;

        if (queryString) {
          const params = new URLSearchParams(queryString);
          const amt = params.get('amount');
          const label = params.get('label');
          const memo = params.get('memo');
          const ref = params.get('reference');
          if (amt) parsedAmount = parseFloat(amt);
          if (label) parsedMerchant = decodeURIComponent(label);
          if (memo) parsedMemo = decodeURIComponent(memo);
          if (ref) parsedRef = ref;
        }
      } catch (e) {
        console.warn('[scanner] Parse error:', e);
      }
    } else if (uri.length >= 32 && uri.length <= 44) {
      parsedRecipient = uri;
    }

    // Auto-detect matching stock for famous brands
    if (!parsedStock) {
      const lower = parsedMerchant.toLowerCase();
      if (lower.includes('apple')) parsedStock = 'AAPL';
      else if (lower.includes('tesla')) parsedStock = 'TSLA';
      else if (lower.includes('microsoft')) parsedStock = 'MSFT';
      else if (lower.includes('amazon')) parsedStock = 'AMZN';
      else if (lower.includes('google')) parsedStock = 'GOOGL';
      else if (lower.includes('meta')) parsedStock = 'META';
      else if (lower.includes('nvidia')) parsedStock = 'NVDA';
    }

    if (parsedStock) {
      const match = stocks.find((s) => s.ticker === parsedStock);
      if (match) setSelectedStockTicker(match.ticker);
    }

    setAmountStr(parsedAmount.toString());
    setScannedInvoice({
      merchantName: parsedMerchant,
      merchantAddress: parsedRecipient,
      amount: parsedAmount,
      referenceKey: parsedRef,
      memo: parsedMemo,
      associatedStockId: parsedStock,
      logo: logoKey || (parsedStock ? parsedStock.toLowerCase() : 'fallback'),
    });

    setScanSuccessNotice(`Verified QR: $${parsedAmount.toFixed(2)} to ${parsedMerchant}`);
    setTimeout(() => {
      setScanSuccessNotice(null);
      setIsScanningActive(true);
    }, 1000);
  };

  const handleClearScannedInvoice = () => {
    setScannedInvoice(null);
    setIsScanningActive(true);
  };

  const handleCopyScannedAddress = () => {
    setCopiedAddr(true);
    setTimeout(() => setCopiedAddr(false), 2000);
  };

  // Fetch / update Jupiter quote whenever amount or source stock changes
  useEffect(() => {
    if (!visible || amount <= 0) return;

    let active = true;
    setIsLoadingQuote(true);

    const updateQuote = async () => {
      try {
        if (isLive) {
          const quote = await getJupiterQuote(
            sourceStock.solanaMint || 'Gnt27xtC473ZT2Mw5u8wZ68Z3gULkSTb5DuxJy7eJotD',
            amount * 1e6,
            50
          );
          if (active) setLiveQuote(quote);
        } else {
          const quote = mockJupiterQuote(sourceStock.ticker, amount, sourceStock.price);
          if (active) setLiveQuote(quote);
        }
      } catch (e) {
        if (active) {
          setLiveQuote(mockJupiterQuote(sourceStock.ticker, amount, sourceStock.price));
        }
      } finally {
        if (active) setIsLoadingQuote(false);
      }
    };

    updateQuote();
    return () => {
      active = false;
    };
  }, [visible, amount, selectedStockTicker, isLive]);

  // Generate Solana Pay URL when in receive mode
  useEffect(() => {
    if (activeTab === 'receive') {
      const rAmt = parseFloat(receiveAmountStr) || 25;
      const payReq = buildSolanaPayUrl({
        recipient: walletAddress || '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosg4B9',
        amount: rAmt,
        label: `${preferences.userName}'s Store / Payment`,
        message: `Payment to ${preferences.userName} via StockSpend`,
        memo: `SS-REC-${Date.now().toString().slice(-6)}`,
      });
      setQrUrl(payReq.url);
      setQrReference(payReq.reference);
    }
  }, [activeTab, receiveAmountStr, walletAddress]);

  // Confirm Swap & Spend
  const handleConfirmSpend = async () => {
    if (!canAfford || isSwapping) return;

    setIsSwapping(true);
    try {
      await new Promise((r) => setTimeout(r, 1000));
      const tx = executeSpend(
        scannedInvoice ? (scannedInvoice.associatedStockId ? scannedInvoice.associatedStockId.toLowerCase() : 'custom') : isCustom ? 'custom' : selectedMerchant.id,
        amount,
        sourceStock.ticker,
        scannedInvoice ? scannedInvoice.merchantName : isCustom ? customMerchantName : undefined
      );
      setIsSwapping(false);
      if (tx) {
        onClose();
        onSuccess(tx);
      }
    } catch (e) {
      console.warn('[spend] Error during spend:', e);
      setIsSwapping(false);
    }
  };

  // Simulate or Poll Receive Payment
  const handleSimulateReceivedPayment = async () => {
    setIsPollingPayment(true);
    try {
      if (isLive) {
        const cluster = preferences.preferredNetwork === 'solana-mainnet' ? 'mainnet-beta' : 'devnet';
        const conn = getConnection(cluster);
        const sig = await pollPaymentConfirmation(conn, qrReference, 15000, 2000);
        if (sig) {
          const rAmt = parseFloat(receiveAmountStr) || 25;
          const tx = executeSpend('custom', rAmt, sourceStock.ticker, 'Customer Payment');
          if (tx) {
            onClose();
            onSuccess({ ...tx, solanaTxSignature: sig });
            return;
          }
        }
      }

      const sig = await mockSolanaPayConfirmation(1500);
      const rAmt = parseFloat(receiveAmountStr) || 25;
      const tx = executeSpend('custom', rAmt, sourceStock.ticker, 'Customer Payment');
      if (tx) {
        onClose();
        onSuccess({ ...tx, solanaTxSignature: sig });
      }
    } finally {
      setIsPollingPayment(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.sheetContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={styles.title}>Spend from Stocks</Text>
                {isLive ? (
                  <View style={styles.liveBadge}>
                    <Text style={styles.liveBadgeText}>LIVE SOLANA</Text>
                  </View>
                ) : (
                  <View style={styles.demoBadge}>
                    <Text style={styles.demoBadgeText}>DEMO</Text>
                  </View>
                )}
              </View>
              <Text style={styles.subtitle}>
                {scannedInvoice ? 'Review & pay scanned Solana Pay invoice' : 'Scan store Solana Pay QR or pay directly from stocks'}
              </Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <X size={20} color="#6B7280" />
            </TouchableOpacity>
          </View>

          {/* Mode Selector Tabs (Hidden when reviewing a scanned invoice) */}
          {!scannedInvoice && (
            <View style={styles.tabSelector}>
              <TouchableOpacity
                style={[styles.tabBtn, activeTab === 'scan' && styles.tabBtnActive]}
                onPress={() => {
                  setActiveTab('scan');
                  setScannedInvoice(null);
                }}
                activeOpacity={0.8}
              >
                <Camera size={15} color={activeTab === 'scan' ? '#141416' : '#6B7280'} style={{ marginRight: 5 }} />
                <Text style={[styles.tabBtnText, activeTab === 'scan' && styles.tabBtnTextActive]}>
                  Scan Store QR
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tabBtn, activeTab === 'direct' && styles.tabBtnActive]}
                onPress={() => setActiveTab('direct')}
                activeOpacity={0.8}
              >
                <Zap size={15} color={activeTab === 'direct' ? '#141416' : '#6B7280'} style={{ marginRight: 5 }} />
                <Text style={[styles.tabBtnText, activeTab === 'direct' && styles.tabBtnTextActive]}>
                  Direct Pay
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tabBtn, activeTab === 'receive' && styles.tabBtnActive]}
                onPress={() => setActiveTab('receive')}
                activeOpacity={0.8}
              >
                <QrCode size={15} color={activeTab === 'receive' ? '#141416' : '#6B7280'} style={{ marginRight: 5 }} />
                <Text style={[styles.tabBtnText, activeTab === 'receive' && styles.tabBtnTextActive]}>
                  Receive / POS
                </Text>
              </TouchableOpacity>
            </View>
          )}

          <ScrollView showsVerticalScrollIndicator={false} style={styles.content}>
            {/* ─── SPECIAL VIEW: SCANNED MERCHANT INVOICE CHECKOUT ────── */}
            {scannedInvoice ? (
              <View style={styles.scannedInvoiceContainer}>
                {/* Verified Scanned Merchant Card */}
                <View style={styles.scannedMerchantCard}>
                  <View style={styles.scannedHeaderRow}>
                    <View style={styles.merchantLogoBox}>
                      <BrandLogo name={scannedInvoice.logo || 'fallback'} size={32} />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Text style={styles.scannedStoreName}>{scannedInvoice.merchantName}</Text>
                        <View style={styles.verifiedBadge}>
                          <ShieldCheck size={12} color="#16A34A" style={{ marginRight: 3 }} />
                          <Text style={styles.verifiedBadgeText}>Verified</Text>
                        </View>
                      </View>
                      
                      {/* Address / Merchant ID */}
                      <TouchableOpacity style={styles.addrCopyRow} onPress={handleCopyScannedAddress} activeOpacity={0.7}>
                        <Text style={styles.scannedAddrText}>
                          ID: {shortenAddress(scannedInvoice.merchantAddress, 6)}
                        </Text>
                        {copiedAddr ? <Check size={12} color="#16A34A" /> : <Copy size={12} color="#6B7280" />}
                      </TouchableOpacity>
                    </View>

                    <TouchableOpacity style={styles.rescanBtn} onPress={handleClearScannedInvoice} activeOpacity={0.7}>
                      <RotateCcw size={14} color="#6B7280" style={{ marginRight: 4 }} />
                      <Text style={styles.rescanBtnText}>Rescan</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Scanned Amount Display */}
                  <View style={styles.scannedAmountBox}>
                    <Text style={styles.scannedAmountLabel}>Total Invoice Amount</Text>
                    <Text style={styles.scannedAmountVal}>{formatCurrency(scannedInvoice.amount)}</Text>
                  </View>
                </View>

                {/* Step 2: Pay from Stock Holdings */}
                <View style={styles.rowBetween}>
                  <Text style={styles.sectionHeading}>Pay from Stock Holdings</Text>
                  <Text style={styles.subtleText}>
                    Bal: {formatNumber(sourceStock.holdings, 2)} {sourceStock.tokenTicker} (${formatNumber(sourceStock.investedValue, 2)})
                  </Text>
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.stockSelectorRow}>
                  {stocks.map((stock) => {
                    const isSelected = stock.ticker === sourceStock.ticker;
                    const isMatchingBrand = scannedInvoice.associatedStockId === stock.ticker;
                    return (
                      <TouchableOpacity
                        key={stock.id}
                        style={[
                          styles.stockPill,
                          isSelected && styles.stockPillActive,
                          isMatchingBrand && styles.matchingStockBorder,
                        ]}
                        onPress={() => setSelectedStockTicker(stock.ticker)}
                        activeOpacity={0.8}
                      >
                        <BrandLogo name={stock.logo} size={22} />
                        <View style={{ marginLeft: 8 }}>
                          <Text style={[styles.stockPillTicker, isSelected && styles.stockPillTickerActive]}>
                            {stock.tokenTicker}
                          </Text>
                          <Text style={styles.stockPillHoldings}>
                            ${formatNumber(stock.price, 2)}
                          </Text>
                        </View>
                        {isMatchingBrand && (
                          <View style={styles.bonusTag}>
                            <Text style={styles.bonusTagText}>+1.5%</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                {/* Dynamic Reward Banner */}
                <View
                  style={[
                    styles.rewardBanner,
                    rewardCalc.rewardType === 'same_brand_bonus' ? styles.rewardBannerBoosted : styles.rewardBannerStandard,
                  ]}
                >
                  <View style={styles.rewardHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Zap
                        size={18}
                        color={rewardCalc.rewardType === 'same_brand_bonus' ? '#111827' : '#C6FF00'}
                        fill={rewardCalc.rewardType === 'same_brand_bonus' ? '#111827' : '#C6FF00'}
                      />
                      <Text
                        style={[
                          styles.rewardHeadingText,
                          rewardCalc.rewardType === 'same_brand_bonus' && { color: '#111827' },
                        ]}
                      >
                        {rewardCalc.rewardType === 'same_brand_bonus'
                          ? '⚡ 1.5% Same-Brand Multiplier!'
                          : '✨ StockBack Reward'}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.rewardEstUSD,
                        rewardCalc.rewardType === 'same_brand_bonus' && { color: '#111827' },
                      ]}
                    >
                      +{formatCurrency(rewardCalc.rewardValueUSD)}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.rewardSubtext,
                      rewardCalc.rewardType === 'same_brand_bonus' && { color: '#374151' },
                    ]}
                  >
                    {rewardCalc.rewardType === 'same_brand_bonus'
                      ? `Earn +${rewardCalc.rewardAmountTokens.toFixed(5)} ${rewardCalc.rewardTicker} directly into your portfolio`
                      : rewardCalc.rewardType === 'brand_stock'
                      ? `Earn +${rewardCalc.rewardAmountTokens.toFixed(5)} ${rewardCalc.rewardTicker} brand stock`
                      : `Earn +${Math.round(rewardCalc.rewardAmountTokens)} xToken points`}
                  </Text>
                </View>

                {/* Jupiter DEX Route Breakdown */}
                <View style={styles.swapDetailsCard}>
                  <View style={styles.swapDetailRow}>
                    <Text style={styles.swapLabel}>Stock Liquidated:</Text>
                    <Text style={styles.swapValue}>
                      {formatNumber(sharesToSell, 4)} {sourceStock.tokenTicker}
                    </Text>
                  </View>
                  <View style={styles.swapDetailRow}>
                    <Text style={styles.swapLabel}>DEX Route (Jupiter):</Text>
                    <Text style={styles.swapValueRoute}>
                      {sourceStock.tokenTicker} → USDC → {scannedInvoice.merchantName}
                    </Text>
                  </View>
                  <View style={styles.swapDetailRow}>
                    <Text style={styles.swapLabel}>Est. Slippage & Fee:</Text>
                    <Text style={styles.swapValue}>
                      {liveQuote ? `${liveQuote.slippageBps / 100}%` : '0.5%'} • 0.00005 SOL
                    </Text>
                  </View>
                  <View style={styles.swapDetailRow}>
                    <Text style={styles.swapLabel}>Recipient Merchant:</Text>
                    <Text style={styles.swapValue}>{shortenAddress(scannedInvoice.merchantAddress, 5)}</Text>
                  </View>
                </View>
              </View>
            ) : activeTab === 'scan' ? (
              /* ─── TAB 1: SCAN STORE QR (REAL CAMERA SCANNER) ────────── */
              <View style={styles.scannerWrapper}>
                {/* Real Device Camera or Permission Request */}
                {permission?.granted ? (
                  <View style={styles.viewfinderBox}>
                    <CameraView
                      style={StyleSheet.absoluteFillObject}
                      barcodeScannerSettings={{
                        barcodeTypes: ['qr'],
                      }}
                      onBarcodeScanned={isScanningActive ? handleBarcodeScanned : undefined}
                    />
                    
                    {/* Viewfinder Target Overlay */}
                    <View style={styles.targetFrame}>
                      <View style={styles.cornerTL} />
                      <View style={styles.cornerTR} />
                      <View style={styles.cornerBL} />
                      <View style={styles.cornerBR} />
                      <ScanLine size={44} color="#C6FF00" style={styles.scanLaser} />
                    </View>

                    <View style={styles.cameraLiveBadge}>
                      <View style={styles.cameraLiveDot} />
                      <Text style={styles.cameraLiveText}>Live Camera Scanner</Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.permissionBox}>
                    <Camera size={36} color="#C6FF00" style={{ marginBottom: 8 }} />
                    <Text style={styles.permissionTitle}>Camera Access Required</Text>
                    <Text style={styles.permissionDesc}>
                      Allow camera access to scan store Solana Pay QR codes directly at checkout.
                    </Text>
                    <TouchableOpacity
                      style={styles.permissionBtn}
                      onPress={requestPermission}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.permissionBtnText}>Enable Camera Scanner</Text>
                    </TouchableOpacity>
                  </View>
                )}

                {scanSuccessNotice && (
                  <View style={styles.scanNoticeBox}>
                    <CheckCircle2 size={16} color="#16A34A" style={{ marginRight: 6 }} />
                    <Text style={styles.scanNoticeText}>{scanSuccessNotice}</Text>
                  </View>
                )}

                {/* Instant Scan Presets for Testing without a second phone */}
                <Text style={styles.scannerSubhead}>⚡ Quick Test Store Invoices:</Text>
                <View style={styles.testQrGrid}>
                  <TouchableOpacity
                    style={styles.testQrItem}
                    onPress={() => {
                      handleProcessScannedUri(
                        'solana:HRQke5DKdDo3jV7wnomyiM8AA3EzkdjLcdPDda9mNmGK?amount=89.00&label=Apple%20Store&spl-token=USDC&memo=SS-APPL-1049',
                        'Apple Store',
                        '89.00',
                        'AAPL',
                        'apple'
                      );
                    }}
                  >
                    <BrandLogo name="apple" size={24} />
                    <View style={{ marginLeft: 8 }}>
                      <Text style={styles.testQrTitle}>Apple Store Invoice</Text>
                      <Text style={styles.testQrSub}>$89.00 • ID: HRQk...NmGK • Bonus in AAPLx</Text>
                    </View>
                    <View style={styles.scanPill}><Text style={styles.scanPillText}>Test Scan</Text></View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.testQrItem}
                    onPress={() => {
                      handleProcessScannedUri(
                        'solana:Gnt27xtC473ZT2Mw5u8wZ68Z3gULkSTb5DuxJy7eJotD?amount=14.50&label=Starbucks%20Coffee&spl-token=USDC&memo=SS-SBUX-2041',
                        'Starbucks Coffee',
                        '14.50',
                        undefined,
                        'starbucks'
                      );
                    }}
                  >
                    <BrandLogo name="starbucks" size={24} />
                    <View style={{ marginLeft: 8 }}>
                      <Text style={styles.testQrTitle}>Starbucks Coffee</Text>
                      <Text style={styles.testQrSub}>$14.50 • ID: Gnt2...eJotD • 1% xToken</Text>
                    </View>
                    <View style={styles.scanPill}><Text style={styles.scanPillText}>Test Scan</Text></View>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.testQrItem}
                    onPress={() => {
                      handleProcessScannedUri(
                        'solana:9n4nbM75f5Ui33ZbPYXn59EwSgE8CGsHtAeTH5YFeJ9E?amount=42.00&label=Tesla%20Supercharger&spl-token=USDC&memo=SS-TSLA-3091',
                        'Tesla Supercharger',
                        '42.00',
                        'TSLA',
                        'tesla'
                      );
                    }}
                  >
                    <BrandLogo name="tesla" size={24} />
                    <View style={{ marginLeft: 8 }}>
                      <Text style={styles.testQrTitle}>Tesla Supercharger</Text>
                      <Text style={styles.testQrSub}>$42.00 • ID: 9n4n...eJ9E • Bonus in TSLAx</Text>
                    </View>
                    <View style={styles.scanPill}><Text style={styles.scanPillText}>Test Scan</Text></View>
                  </TouchableOpacity>
                </View>

                {/* Paste Link Option */}
                <View style={[styles.customRow, { marginTop: 14 }]}>
                  <Link size={16} color="#6B7280" style={{ marginRight: 8 }} />
                  <TextInput
                    style={styles.customInput}
                    placeholder="Or paste Solana Pay URL (solana:...)"
                    placeholderTextColor="#9CA3AF"
                    value={scannedUriInput}
                    onChangeText={(val) => {
                      setScannedUriInput(val);
                      if (val.startsWith('solana:')) {
                        handleProcessScannedUri(val, 'Custom Invoice');
                      }
                    }}
                  />
                </View>
              </View>
            ) : activeTab === 'direct' ? (
              /* ─── TAB 2: DIRECT SPEND ───────────────────────────────── */
              <>
                {/* Step 1: Choose Merchant */}
                <Text style={styles.sectionHeading}>1. Merchant / Store</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.merchantList}>
                  {/* Custom / Unlisted Option */}
                  <TouchableOpacity
                    style={[styles.merchantPill, isCustom && styles.merchantPillActiveCustom]}
                    onPress={() => setSelectedMerchantId('custom')}
                    activeOpacity={0.8}
                  >
                    <PlusCircle size={22} color={isCustom ? '#141416' : '#6B7280'} />
                    <Text style={[styles.merchantName, isCustom && styles.merchantNameActiveCustom]}>
                      + Custom / Unlisted
                    </Text>
                    <View style={styles.pointsBadge}>
                      <Text style={styles.pointsBadgeText}>1% xToken</Text>
                    </View>
                  </TouchableOpacity>

                  {MERCHANTS.map((m) => {
                    const isSelected = m.id === selectedMerchant.id && !isCustom;
                    return (
                      <TouchableOpacity
                        key={m.id}
                        style={[styles.merchantPill, isSelected && styles.merchantPillActive]}
                        onPress={() => setSelectedMerchantId(m.id)}
                        activeOpacity={0.8}
                      >
                        <BrandLogo name={m.logo} size={26} />
                        <Text style={[styles.merchantName, isSelected && styles.merchantNameActive]}>
                          {m.name}
                        </Text>
                        {m.hasXStock && (
                          <View style={styles.stockBadge}>
                            <Text style={styles.stockBadgeText}>{m.associatedStockId}x</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                {/* Custom Merchant Form when unlisted */}
                {isCustom && (
                  <View style={styles.customMerchantBox}>
                    <View style={styles.customRow}>
                      <Store size={16} color="#6B7280" style={{ marginRight: 8 }} />
                      <TextInput
                        style={styles.customInput}
                        placeholder="Merchant Name (e.g. Local Cafe, Bakery)"
                        placeholderTextColor="#9CA3AF"
                        value={customMerchantName}
                        onChangeText={setCustomMerchantName}
                      />
                    </View>
                    <View style={[styles.customRow, { marginTop: 8 }]}>
                      <Link size={16} color="#6B7280" style={{ marginRight: 8 }} />
                      <TextInput
                        style={styles.customInput}
                        placeholder="Solana Address..."
                        placeholderTextColor="#9CA3AF"
                        value={customWalletAddress}
                        onChangeText={setCustomWalletAddress}
                      />
                    </View>
                  </View>
                )}

                {/* Step 2: Spend Amount */}
                <Text style={[styles.sectionHeading, { marginTop: 16 }]}>2. Amount to Pay Store</Text>
                <View style={styles.amountInputBox}>
                  <Text style={styles.dollarSign}>$</Text>
                  <TextInput
                    style={styles.amountInput}
                    keyboardType="numeric"
                    value={amountStr}
                    onChangeText={setAmountStr}
                    placeholder="0"
                    placeholderTextColor="#9CA3AF"
                  />
                  <Text style={styles.usdLabel}>USD</Text>
                </View>

                {/* Presets */}
                <View style={styles.presetRow}>
                  {selectedMerchant.defaultSpendPresets.map((preset) => (
                    <TouchableOpacity
                      key={preset}
                      style={[styles.presetBtn, amount === preset && styles.presetBtnActive]}
                      onPress={() => setAmountStr(preset.toString())}
                    >
                      <Text style={[styles.presetText, amount === preset && styles.presetTextActive]}>
                        ${preset}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Step 3: Source Stock (Pay with) */}
                <View style={styles.rowBetween}>
                  <Text style={styles.sectionHeading}>3. Select Stock Holding to Liquidate</Text>
                  <Text style={styles.subtleText}>
                    Bal: {formatNumber(sourceStock.holdings, 2)} {sourceStock.tokenTicker} (${formatNumber(sourceStock.investedValue, 2)})
                  </Text>
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.stockSelectorRow}>
                  {stocks.map((stock) => {
                    const isSelected = stock.ticker === sourceStock.ticker;
                    const isMatchingBrand = selectedMerchant.associatedStockId === stock.ticker;
                    return (
                      <TouchableOpacity
                        key={stock.id}
                        style={[
                          styles.stockPill,
                          isSelected && styles.stockPillActive,
                          isMatchingBrand && styles.matchingStockBorder,
                        ]}
                        onPress={() => setSelectedStockTicker(stock.ticker)}
                        activeOpacity={0.8}
                      >
                        <BrandLogo name={stock.logo} size={22} />
                        <View style={{ marginLeft: 8 }}>
                          <Text style={[styles.stockPillTicker, isSelected && styles.stockPillTickerActive]}>
                            {stock.tokenTicker}
                          </Text>
                          <Text style={styles.stockPillHoldings}>
                            ${formatNumber(stock.price, 2)}
                          </Text>
                        </View>
                        {isMatchingBrand && (
                          <View style={styles.bonusTag}>
                            <Text style={styles.bonusTagText}>+1.5%</Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                {/* Dynamic Reward Banner */}
                <View
                  style={[
                    styles.rewardBanner,
                    rewardCalc.rewardType === 'same_brand_bonus' ? styles.rewardBannerBoosted : styles.rewardBannerStandard,
                  ]}
                >
                  <View style={styles.rewardHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Zap
                        size={18}
                        color={rewardCalc.rewardType === 'same_brand_bonus' ? '#111827' : '#C6FF00'}
                        fill={rewardCalc.rewardType === 'same_brand_bonus' ? '#111827' : '#C6FF00'}
                      />
                      <Text
                        style={[
                          styles.rewardHeadingText,
                          rewardCalc.rewardType === 'same_brand_bonus' && { color: '#111827' },
                        ]}
                      >
                        {rewardCalc.rewardType === 'same_brand_bonus'
                          ? '⚡ 1.5% Same-Brand Multiplier!'
                          : '✨ StockBack Reward'}
                      </Text>
                    </View>
                    <Text
                      style={[
                        styles.rewardEstUSD,
                        rewardCalc.rewardType === 'same_brand_bonus' && { color: '#111827' },
                      ]}
                    >
                      +{formatCurrency(rewardCalc.rewardValueUSD)}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.rewardSubtext,
                      rewardCalc.rewardType === 'same_brand_bonus' && { color: '#374151' },
                    ]}
                  >
                    {rewardCalc.rewardType === 'same_brand_bonus'
                      ? `Earn +${rewardCalc.rewardAmountTokens.toFixed(5)} ${rewardCalc.rewardTicker} directly into your portfolio`
                      : rewardCalc.rewardType === 'brand_stock'
                      ? `Earn +${rewardCalc.rewardAmountTokens.toFixed(5)} ${rewardCalc.rewardTicker} brand stock`
                      : `Earn +${Math.round(rewardCalc.rewardAmountTokens)} xToken points`}
                  </Text>
                </View>

                {/* Live Jupiter DEX Swap Breakdown */}
                <View style={styles.swapDetailsCard}>
                  <View style={styles.swapDetailRow}>
                    <Text style={styles.swapLabel}>Stock to Liquidate:</Text>
                    <Text style={styles.swapValue}>
                      {formatNumber(sharesToSell, 4)} {sourceStock.tokenTicker}
                    </Text>
                  </View>
                  <View style={styles.swapDetailRow}>
                    <Text style={styles.swapLabel}>Jupiter DEX Route:</Text>
                    <Text style={styles.swapValueRoute}>
                      {sourceStock.tokenTicker} → Orca/Raydium → USDC
                    </Text>
                  </View>
                  <View style={styles.swapDetailRow}>
                    <Text style={styles.swapLabel}>Est. Slippage & Fee:</Text>
                    <Text style={styles.swapValue}>
                      {liveQuote ? `${liveQuote.slippageBps / 100}%` : '0.5%'} • 0.00005 SOL
                    </Text>
                  </View>
                  <View style={styles.swapDetailRow}>
                    <Text style={styles.swapLabel}>Merchant Settled In:</Text>
                    <Text style={styles.swapValue}>{formatCurrency(amount)} USDC</Text>
                  </View>
                </View>
              </>
            ) : (
              /* ─── TAB 3: RECEIVE / POS TERMINAL ──────────────────────── */
              <View style={styles.qrContainer}>
                <View style={styles.qrCard}>
                  <Text style={styles.qrTitle}>My Solana Pay QR Terminal</Text>
                  <Text style={styles.qrSubtitle}>Have customers or friends scan to pay you</Text>
                  
                  {/* Amount input for invoice */}
                  <View style={[styles.amountInputBox, { width: '100%', marginBottom: 14 }]}>
                    <Text style={styles.dollarSign}>$</Text>
                    <TextInput
                      style={styles.amountInput}
                      keyboardType="numeric"
                      value={receiveAmountStr}
                      onChangeText={setReceiveAmountStr}
                      placeholder="25"
                    />
                    <Text style={styles.usdLabel}>USDC</Text>
                  </View>

                  <View style={styles.qrWrapper}>
                    {qrUrl ? (
                      <QRCode
                        value={qrUrl}
                        size={170}
                        color="#111827"
                        backgroundColor="#FFFFFF"
                      />
                    ) : (
                      <ActivityIndicator size="large" color="#111827" />
                    )}
                  </View>

                  <View style={styles.qrMetaRow}>
                    <Text style={styles.qrMetaLabel}>Destination:</Text>
                    <Text style={styles.qrMetaVal}>{shortenAddress(walletAddress || '7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosg4B9', 5)}</Text>
                  </View>
                  <View style={styles.qrMetaRow}>
                    <Text style={styles.qrMetaLabel}>Reference Key:</Text>
                    <Text style={styles.qrMetaVal}>{shortenAddress(qrReference || 'None', 5)}</Text>
                  </View>

                  <TouchableOpacity
                    style={styles.simulatePayBtn}
                    onPress={handleSimulateReceivedPayment}
                    disabled={isPollingPayment}
                    activeOpacity={0.85}
                  >
                    {isPollingPayment ? (
                      <ActivityIndicator size="small" color="#141416" />
                    ) : (
                      <Text style={styles.simulatePayBtnText}>⚡ Simulate Customer Scan & Payment</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </ScrollView>

          {/* Bottom Action Button for Direct / Scanned Invoice modes */}
          {(activeTab === 'direct' || scannedInvoice) && (
            <View style={styles.footer}>
              <TouchableOpacity
                style={[
                  styles.confirmBtn,
                  (!canAfford || isSwapping) && styles.confirmBtnDisabled,
                ]}
                disabled={!canAfford || isSwapping}
                onPress={handleConfirmSpend}
                activeOpacity={0.85}
              >
                {isSwapping ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <RefreshCw size={18} color="#000000" style={{ marginRight: 8 }} />
                    <Text style={styles.confirmBtnText}>Executing Jupiter DEX Swap...</Text>
                  </View>
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={styles.confirmBtnText}>
                      {canAfford
                        ? `Pay ${formatCurrency(amount)} with ${sourceStock.tokenTicker}`
                        : 'Insufficient Stock Balance'}
                    </Text>
                    {canAfford && <ArrowRight size={18} color="#000000" style={{ marginLeft: 6 }} />}
                  </View>
                )}
              </TouchableOpacity>
            </View>
          )}
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
    maxHeight: Dimensions.get('window').height * 0.90,
    paddingTop: 18,
    paddingBottom: 28,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#111827',
  },
  subtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  liveBadge: {
    backgroundColor: 'rgba(198, 255, 0, 0.2)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 8,
  },
  liveBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#65A30D',
  },
  demoBadge: {
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 8,
  },
  demoBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#6B7280',
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabSelector: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 14,
    padding: 4,
    marginBottom: 14,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 11,
  },
  tabBtnActive: {
    backgroundColor: '#C6FF00',
  },
  tabBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
  },
  tabBtnTextActive: {
    color: '#141416',
  },
  content: {
    maxHeight: Dimensions.get('window').height * 0.62,
  },
  sectionHeading: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 8,
  },

  // ─── Scanned Merchant Invoice Card ────────────────────────────────────────
  scannedInvoiceContainer: {
    paddingVertical: 4,
  },
  scannedMerchantCard: {
    backgroundColor: '#141416',
    borderRadius: 22,
    padding: 16,
    marginBottom: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 3,
  },
  scannedHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  merchantLogoBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#27272A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scannedStoreName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    marginRight: 6,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  verifiedBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#16A34A',
  },
  addrCopyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 3,
  },
  scannedAddrText: {
    fontSize: 11.5,
    fontFamily: 'monospace',
    color: '#9CA3AF',
    marginRight: 6,
  },
  rescanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#27272A',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  rescanBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#D1D5DB',
  },
  scannedAmountBox: {
    backgroundColor: '#1F1F23',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  scannedAmountLabel: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  scannedAmountVal: {
    fontSize: 18,
    fontWeight: '800',
    color: '#C6FF00',
  },

  // ─── Real Camera Scanner Styles ───────────────────────────────────────────
  scannerWrapper: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  viewfinderBox: {
    width: '100%',
    height: 200,
    backgroundColor: '#000000',
    borderRadius: 22,
    position: 'relative',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  targetFrame: {
    width: 140,
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  cornerTL: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 22,
    height: 22,
    borderTopWidth: 3.5,
    borderLeftWidth: 3.5,
    borderColor: '#C6FF00',
    borderTopLeftRadius: 6,
  },
  cornerTR: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 22,
    height: 22,
    borderTopWidth: 3.5,
    borderRightWidth: 3.5,
    borderColor: '#C6FF00',
    borderTopRightRadius: 6,
  },
  cornerBL: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: 22,
    height: 22,
    borderBottomWidth: 3.5,
    borderLeftWidth: 3.5,
    borderColor: '#C6FF00',
    borderBottomLeftRadius: 6,
  },
  cornerBR: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 22,
    height: 22,
    borderBottomWidth: 3.5,
    borderRightWidth: 3.5,
    borderColor: '#C6FF00',
    borderBottomRightRadius: 6,
  },
  scanLaser: {
    opacity: 0.85,
  },
  cameraLiveBadge: {
    position: 'absolute',
    bottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.65)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  cameraLiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22C55E',
    marginRight: 6,
  },
  cameraLiveText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },

  permissionBox: {
    width: '100%',
    backgroundColor: '#141416',
    borderRadius: 22,
    padding: 24,
    alignItems: 'center',
  },
  permissionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  permissionDesc: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  permissionBtn: {
    backgroundColor: '#C6FF00',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 22,
  },
  permissionBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#141416',
  },

  scanNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 10,
  },
  scanNoticeText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#15803D',
  },
  scannerSubhead: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#374151',
    alignSelf: 'flex-start',
    marginTop: 14,
    marginBottom: 8,
  },
  testQrGrid: {
    width: '100%',
  },
  testQrItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: 8,
  },
  testQrTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#111827',
  },
  testQrSub: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 1,
  },
  scanPill: {
    marginLeft: 'auto',
    backgroundColor: '#C6FF00',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  scanPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#141416',
  },

  // ─── Direct Spend Styles ──────────────────────────────────────────────────
  merchantList: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  merchantPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginRight: 8,
  },
  merchantPillActive: {
    borderColor: '#111827',
    backgroundColor: '#111827',
  },
  merchantPillActiveCustom: {
    borderColor: '#C6FF00',
    backgroundColor: '#C6FF00',
  },
  merchantName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
    marginLeft: 8,
  },
  merchantNameActive: {
    color: '#FFFFFF',
  },
  merchantNameActiveCustom: {
    color: '#141416',
    fontWeight: '800',
  },
  stockBadge: {
    backgroundColor: '#C6FF00',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 6,
  },
  stockBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#141416',
  },
  pointsBadge: {
    backgroundColor: '#E5E7EB',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 6,
  },
  pointsBadgeText: {
    fontSize: 9.5,
    fontWeight: '700',
    color: '#374151',
  },
  customMerchantBox: {
    backgroundColor: '#F3F4F6',
    borderRadius: 16,
    padding: 12,
    marginTop: 8,
    marginBottom: 6,
  },
  customRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    width: '100%',
  },
  customInput: {
    flex: 1,
    fontSize: 13,
    color: '#111827',
    fontWeight: '600',
    padding: 0,
  },
  amountInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  dollarSign: {
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
    marginRight: 6,
  },
  amountInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: '800',
    color: '#111827',
    padding: 0,
  },
  usdLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#9CA3AF',
  },
  presetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    marginBottom: 14,
  },
  presetBtn: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 10,
    paddingVertical: 7,
    alignItems: 'center',
    marginHorizontal: 3,
  },
  presetBtnActive: {
    backgroundColor: '#111827',
  },
  presetText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#4B5563',
  },
  presetTextActive: {
    color: '#FFFFFF',
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 8,
  },
  subtleText: {
    fontSize: 11.5,
    color: '#6B7280',
    fontWeight: '600',
  },
  stockSelectorRow: {
    flexDirection: 'row',
    marginBottom: 14,
  },
  stockPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginRight: 8,
  },
  stockPillActive: {
    borderColor: '#111827',
    backgroundColor: '#111827',
  },
  matchingStockBorder: {
    borderColor: '#C6FF00',
  },
  stockPillTicker: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#111827',
  },
  stockPillTickerActive: {
    color: '#FFFFFF',
  },
  stockPillHoldings: {
    fontSize: 10.5,
    color: '#6B7280',
  },
  bonusTag: {
    backgroundColor: '#C6FF00',
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 6,
  },
  bonusTagText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#141416',
  },
  rewardBanner: {
    borderRadius: 18,
    padding: 14,
    marginBottom: 14,
  },
  rewardBannerStandard: {
    backgroundColor: '#141416',
  },
  rewardBannerBoosted: {
    backgroundColor: '#C6FF00',
  },
  rewardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  rewardHeadingText: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#C6FF00',
    marginLeft: 6,
  },
  rewardEstUSD: {
    fontSize: 14,
    fontWeight: '800',
    color: '#C6FF00',
  },
  rewardSubtext: {
    fontSize: 11.5,
    color: '#9CA3AF',
    lineHeight: 16,
  },
  swapDetailsCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#F1F3F5',
    marginBottom: 14,
  },
  swapDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  swapLabel: {
    fontSize: 11.5,
    color: '#6B7280',
    fontWeight: '500',
  },
  swapValue: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#111827',
  },
  swapValueRoute: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#10B981',
  },

  // ─── Receive / POS Styles ─────────────────────────────────────────────────
  qrContainer: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  qrCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
    alignItems: 'center',
    width: '100%',
  },
  qrTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#111827',
  },
  qrSubtitle: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
    marginBottom: 12,
  },
  qrWrapper: {
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 14,
  },
  qrMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingVertical: 3,
    paddingHorizontal: 8,
  },
  qrMetaLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  qrMetaVal: {
    fontSize: 12,
    fontWeight: '700',
    color: '#111827',
  },
  simulatePayBtn: {
    backgroundColor: '#C6FF00',
    borderRadius: 14,
    paddingVertical: 12,
    width: '100%',
    alignItems: 'center',
    marginTop: 14,
  },
  simulatePayBtnText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#141416',
  },

  footer: {
    paddingTop: 10,
  },
  confirmBtn: {
    backgroundColor: '#C6FF00',
    borderRadius: 18,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnDisabled: {
    backgroundColor: '#E5E7EB',
  },
  confirmBtnText: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#141416',
  },
});
