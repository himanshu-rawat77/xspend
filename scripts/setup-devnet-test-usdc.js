/**
 * Creates a 6-decimal test USDC mint on Solana devnet, a merchant wallet,
 * and mints tUSDC to a Seeker (or any) wallet.
 *
 * Usage:
 *   node scripts/setup-devnet-test-usdc.js --wallet <SEEKER_PUBKEY>
 */
const fs = require('fs');
const path = require('path');
const { Connection, Keypair, PublicKey, LAMPORTS_PER_SOL } = require('@solana/web3.js');
const {
  createMint,
  getOrCreateAssociatedTokenAccount,
  mintTo,
  getAccount,
} = require('@solana/spl-token');

const ROOT = path.resolve(__dirname, '..');
const DEVNET_DIR = path.join(ROOT, '.devnet');
const CONFIG_PATH = path.join(ROOT, 'src', 'config', 'devnet.ts');
const DECIMALS = 6;
const MINT_AMOUNT = 10_000 * 10 ** DECIMALS;

function arg(name) {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx >= 0 && process.argv[idx + 1]) return process.argv[idx + 1];
  return process.env[name.toUpperCase()] || process.env[`SEEKER_${name.toUpperCase()}`];
}

function loadOrCreateKeypair(file) {
  if (fs.existsSync(file)) {
    const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
    return Keypair.fromSecretKey(Uint8Array.from(raw));
  }
  const kp = Keypair.generate();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(Array.from(kp.secretKey)));
  return kp;
}

async function airdrop(connection, pubkey, sol = 2) {
  const sig = await connection.requestAirdrop(pubkey, sol * LAMPORTS_PER_SOL);
  const latest = await connection.getLatestBlockhash();
  await connection.confirmTransaction({
    signature: sig,
    blockhash: latest.blockhash,
    lastValidBlockHeight: latest.lastValidBlockHeight,
  });
  return sig;
}

function writeConfig(mint, merchant) {
  const body = `/**
 * Devnet SPL test assets.
 * Mint + merchant are written by \`npm run setup:devnet\`.
 * Secrets (mint authority, merchant keypair) stay in \`.devnet/\` (gitignored).
 */
export const DEVNET_TEST_USDC = {
  mint: '${mint}',
  decimals: 6 as const,
  symbol: 'tUSDC',
  merchantWallet: '${merchant}',
};

export function isDevnetSplConfigured(): boolean {
  return DEVNET_TEST_USDC.mint.length >= 32 && DEVNET_TEST_USDC.merchantWallet.length >= 32;
}
`;
  fs.writeFileSync(CONFIG_PATH, body);
}

async function main() {
  const wallet = arg('wallet');
  if (!wallet) {
    console.error('Missing --wallet <SEEKER_PUBKEY>');
    process.exit(1);
  }
  const recipient = new PublicKey(wallet);
  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');

  fs.mkdirSync(DEVNET_DIR, { recursive: true });
  const authority = loadOrCreateKeypair(path.join(DEVNET_DIR, 'mint-authority.json'));
  const merchant = loadOrCreateKeypair(path.join(DEVNET_DIR, 'merchant.json'));

  console.log('Mint authority:', authority.publicKey.toBase58());
  console.log('Merchant:      ', merchant.publicKey.toBase58());
  console.log('Seeker wallet: ', recipient.toBase58());

  try {
    await airdrop(connection, authority.publicKey, 2);
  } catch (e) {
    console.warn('Authority airdrop failed (rate limit?). Need ~0.5 SOL on', authority.publicKey.toBase58(), e.message);
  }

  const mint = await createMint(connection, authority, authority.publicKey, null, DECIMALS);
  console.log('tUSDC mint:    ', mint.toBase58());

  const seekerAta = await getOrCreateAssociatedTokenAccount(connection, authority, mint, recipient);
  await mintTo(connection, authority, mint, seekerAta.address, authority, MINT_AMOUNT);

  const merchantAta = await getOrCreateAssociatedTokenAccount(connection, authority, mint, merchant.publicKey);
  const seekerBal = await getAccount(connection, seekerAta.address);
  const merchantBal = await getAccount(connection, merchantAta.address);

  writeConfig(mint.toBase58(), merchant.publicKey.toBase58());

  console.log('\nMinted 10000 tUSDC to Seeker ATA', seekerAta.address.toBase58());
  console.log('Seeker tUSDC:  ', Number(seekerBal.amount) / 10 ** DECIMALS);
  console.log('Merchant tUSDC:', Number(merchantBal.amount) / 10 ** DECIMALS);
  console.log('\nWrote', CONFIG_PATH);
  console.log('Pay on device, then after confirm check merchant ATA increased.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
