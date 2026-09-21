# xSpend

Spend tokenized assets through Solana Pay, with a Seeker-native wallet experience.

xSpend is a React Native / Expo prototype for Stocklana. It explores a simple loop:

```text
hold an on-chain asset -> scan a payment QR -> sign on Seeker -> settle on Solana
```

The product vision is to make tokenized stocks spendable while turning purchases into StockBack rewards.

## Current Status

This repository contains two clearly separated experiences:

| Mode | What it demonstrates |
| --- | --- |
| Demo | Complete product UX with simulated portfolio, quotes, payments, and sandbox rewards |
| Live / Devnet | Seeker MWA signing, real Solana RPC confirmation, and real devnet SPL settlement |

The verified devnet transaction below transferred **50 tUSDC** from the test wallet to the merchant wallet. It is a real SPL-token transfer. It is not a Jupiter xStock swap, and StockBack rewards are still simulated.

**Verified payment:** [50 tUSDC devnet transaction](https://explorer.solana.com/tx/3yofkYJmUCF2CNtxLXduGxnbGvWvuw5spZTMvxhsMx1VzgPDzzV29ZzcG6S2WqgtaQ1to7mg13S2Cd43GvZhDMPV?cluster=devnet)

## Product Flow

1. Connect a Solana wallet through Seeker / Mobile Wallet Adapter.
2. Scan a Solana Pay invoice or choose a merchant in the demo catalog.
3. Select the asset used for payment.
4. Review the amount, route, slippage, and merchant settlement asset.
5. Approve the transaction in the wallet.
6. Show an immediate `Submitted` receipt while confirmation runs in the background.
7. Apply local portfolio effects only after RPC confirmation.

In the current devnet test path, the settlement asset is a locally created six-decimal token named `tUSDC`. In the planned production path, xStock liquidity would be routed through Jupiter into a merchant settlement asset.

## Seeker Support

xSpend uses Mobile Wallet Adapter for native Android wallet approval. This is intended for a standalone development or production build on a Seeker or another MWA-compatible Android wallet. Expo Go does not include the native MWA module.

The app also includes Phantom and Solflare deep-link helpers plus manual read-only wallet address entry.

## Quick Start

### Requirements

- Node.js 18+
- Android Studio / Android SDK for native Android builds
- A Seeker or MWA-compatible Android wallet for live signing
- Java 17 for Android builds

### Install

```bash
npm install
npx tsc --noEmit
```

### Run the UI

```bash
npx expo start
```

Use Demo Mode for the full product walkthrough. Use a standalone Android build for MWA testing:

```bash
npx expo run:android
```

The app is currently pinned to Expo SDK 51. Check the repository's Expo instructions before changing the SDK or native dependencies.

## Real Devnet SPL Test

The in-app faucet requests devnet SOL for fees. It does not mint tokens. The setup script creates a local devnet mint, a merchant wallet, and test-token inventory.

```bash
npm run setup:devnet -- --wallet <SEEKER_PUBLIC_KEY>
```

The script writes the public mint and merchant wallet to `src/config/devnet.ts`. Mint authority and merchant keypairs are kept in `.devnet/`, which is gitignored.

Then:

1. Build and install xSpend on the Seeker.
2. Connect through Profile -> Seeker / MWA.
3. Select Live Mode and Devnet.
4. Claim devnet SOL if needed.
5. Use the spend flow to send tUSDC to the merchant wallet.
6. Confirm the receipt changes from `Submitted` to `Confirmed`.
7. Verify the merchant token balance and transaction on Explorer.

## Demo vs Live Behavior

| Capability | Demo | Devnet / Live |
| --- | --- | --- |
| Wallet | Optional | MWA / connected wallet |
| Payment | Simulated | Signed on-chain transaction |
| Confirmation | Immediate | Background RPC polling |
| Devnet settlement | Simulated | Real tUSDC SPL transfer |
| Mainnet xStock route | Simulated | Requires supported liquidity |
| StockBack | Sandbox ledger | Not yet distributed on-chain |

The receipt uses these states:

- `Submitted`: transaction broadcast; confirmation pending
- `Confirming`: RPC status is being checked
- `Confirmed`: settlement is confirmed and local effects are applied
- `Failed` / `Unknown`: the user can retry status verification

## Architecture

```text
App.tsx
  screens/                 Product surfaces and navigation
  components/SpendModal    QR, quote, signing, confirmation, receipt flow
  services/wallet.ts       MWA, RPC, transaction construction
  services/jupiter.ts      Jupiter quote and atomic swap construction
  services/solanaPay.ts    Solana Pay URLs and payment polling
  services/xstocks.ts      xStock registry, prices, and token balances
  services/faucet.ts       Devnet SOL and test-token status
  services/rewards.ts      StockBack calculation and sandbox dispatch
  store/useStockStore.ts   Portfolio and transaction state
```

## Important Limitations

- StockBack rewards are simulated and are not backed by an on-chain treasury.
- The verified devnet payment is a direct tUSDC SPL transfer, not an xStock-to-USDC Jupiter swap.
- Mainnet xStock settlement depends on real token liquidity, merchant token accounts, RPC reliability, and issuer / compliance constraints.
- The local portfolio is a demo ledger until balances are synced from the connected wallet.
- This project is educational software and is not financial advice.

## Next Milestones

1. Replace sandbox StockBack with a funded reward vault or claimable on-chain program.
2. Verify merchant token balance deltas before marking settlement complete.
3. Remove any payment fallback that changes the settlement asset.
4. Add a real xStock liquidity route and a production merchant flow.
5. Add merchant onboarding, refund handling, and stronger transaction tests.

## Tech Stack

- React Native + Expo SDK 51
- TypeScript
- Zustand
- Solana Web3.js
- Solana Mobile Wallet Adapter
- SPL Token
- Jupiter Aggregator APIs
- Solana Pay
- Backed / xStocks registry integration

## License

MIT. Educational and demonstration use only.
