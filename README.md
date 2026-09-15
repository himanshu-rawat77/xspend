# ⚡ xspend — The Stock-Powered Payment Engine on Solana

**xspend** transforms tokenized equities into a spendable, yield-generating liquid payment layer on Solana. Instead of sitting idle in a brokerage account, tokenized real-world stocks (Backed Finance **xStocks**) can now be spent at everyday merchants with instant settlement, tax-optimized liquidation, and brand-aligned equity rewards.

---

## 🎯 The Problem
1. **Trapped Capital**: Over \$100B+ in tokenized equities and RWAs are held as passive investments without direct liquidity in consumer commerce.
2. **Tax Inefficiency**: Spending investment portfolios manually triggers complex capital gains calculations and suboptimal asset liquidation.
3. **Generic Rewards**: Traditional credit cards offer depreciating fiat cashback or airline points rather than appreciating ownership in the brands consumers buy from.

---

## 💡 The Solution: xspend
xspend enables anyone holding tokenized equities (such as `NVDAx`, `AAPLx`, `TSLAx`, `MSFTx`, `SPYx`, and `QQQx`) to pay at any merchant via QR code or Solana Pay. Behind the scenes, the protocol calculates the most tax-advantaged liquidation route, executes swaps via Jupiter Aggregator, settles the merchant in stablecoins/USDC, and rewards the user with fractional stock ownership.

---

## 🚀 Key Features

### 1. ⚡ Instant QR Scan-and-Pay
- Camera scanner with automatic parsing of Solana Pay URLs, merchant IDs, and payment requests.
- Instant sub-second confirmation on Solana with near-zero transaction fees.

### 2. 🧠 Smart Liquidation Engine
Users can configure how their stock portfolio is liquidated at checkout:
- **Lowest Capital Gains Tax (Default)**: Automatically sells lots with minimal unrealized tax burden.
- **Equal Pro-Rata**: Liquidates a proportional fraction across the user’s entire stock basket.
- **Single Asset Priority**: Liquidates from a designated primary stock holding first.

### 3. ✨ 1.5% Same-Brand StockBack™ Rewards
- Pay at **Starbucks** ➔ Earn **\$SBUXx**
- Pay at **Nike** ➔ Earn **\$NKEx**
- Pay at **Apple Store** ➔ Earn **\$AAPLx**
- Pay at **Uber** ➔ Earn **\$UBERx**
- Turn everyday consumer spending into continuous equity accumulation.

### 4. 📊 24+ Tokenized Equities & Live Market Oracles
- Full integration with 24 verified Backed Finance SPL xStocks (NVIDIA, Apple, Microsoft, Tesla, Palantir, S&P 500 ETF, Nasdaq ETF, etc.).
- Real-time pricing via **Pyth Network Hermes Oracles** and live market chart feeds.

### 5. 👛 Live & Demo Dual-Mode
- **Demo Mode**: Full sandbox with simulated wallet, merchant scanner, and instant spending for judging and testing.
- **Live Mode**: Real Solana Mainnet-Beta connection with Phantom/Solflare deep linking, custom public key lookup, and on-chain RPC token balance sync.

---

## 🛠️ Architecture & Tech Stack

- **Frontend / Mobile**: React Native (Expo SDK 51), Hermes JavaScript Engine, TypeScript, Zustand state management.
- **Blockchain**: Solana Web3.js (`@solana/web3.js`), Solana Pay protocol standard.
- **DEX & Liquidity**: Jupiter Aggregator API v6 for optimal swap execution.
- **Price Oracles**: Pyth Network Hermes low-latency data feeds.
- **Token Standard**: SPL Token-2022 & SPL standard token integration for Backed Finance xStocks.

---

## 🗺️ What's Next
- **xspend Virtual Debit Card**: NFC / Apple Pay integration via virtual Visa/Mastercard rails.
- **Automated Dollar-Cost-Averaging (DCA)**: Auto-invest leftover change into index xStocks (SPYx / QQQx).
- **Merchant SDK**: One-click plugin for Shopify, WooCommerce, and Square POS terminals.
