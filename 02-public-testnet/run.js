// 02-public-testnet/run.js
// Master Runner for Public Testnet (Base Sepolia L2 / Ethereum Sepolia L1)

const fs = require('fs');
const path = require('path');
const { ethers } = require('ethers');
const networks = require('./config/networks');
const db = require('./services/db');
const TransactionRelayer = require('./services/relayer');
const BlockchainIndexer = require('./services/indexer');

const ENV_FILE = path.join(__dirname, '.env.testnet');

function loadEnv() {
  if (!fs.existsSync(ENV_FILE)) {
    return null;
  }
  const content = fs.readFileSync(ENV_FILE, 'utf8');
  const env = {};
  content.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [k, ...v] = trimmed.split('=');
      env[k.trim()] = v.join('=').trim();
    }
  });
  return env;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  const args = process.argv.slice(2);
  let networkKey = 'base-sepolia';

  args.forEach(arg => {
    if (arg.startsWith('--network=')) {
      networkKey = arg.split('=')[1];
    }
  });

  const netConfig = networks[networkKey];
  if (!netConfig) {
    console.error(`❌ Unknown network: "${networkKey}". Choose from: ${Object.keys(networks).join(', ')}`);
    process.exit(1);
  }

  console.log('='.repeat(80));
  console.log(`🌐 PATH 2: PUBLIC TESTNET EXPERIMENTATION`);
  console.log(`Target Network:   ${netConfig.name}`);
  console.log(`RPC URL:          ${netConfig.rpcUrl}`);
  console.log(`Chain ID:         ${netConfig.chainId}`);
  console.log('='.repeat(80));

  // 1. Check Wallet Configuration
  const env = loadEnv();
  if (!env || !env.TESTNET_PRIVATE_KEY) {
    console.log('\n⚠️  NO TESTNET WALLET CONFIGURED YET!');
    console.log('Jalankan perintah ini terlebih dahulu untuk membuat wallet testnet otomatis:');
    console.log('👉 npm run wallet:generate\n');
    process.exit(0);
  }

  const provider = new ethers.JsonRpcProvider(netConfig.rpcUrl);
  const wallet = new ethers.Wallet(env.TESTNET_PRIVATE_KEY, provider);

  console.log(`Wallet Address:   ${wallet.address}`);
  console.log(`Explorer Link:    ${netConfig.explorerAddressUrl}${wallet.address}`);

  // 2. Balance Check & Faucet Guard
  const balance = await provider.getBalance(wallet.address);
  const balanceEth = ethers.formatEther(balance);
  console.log(`Current Balance:  ${balanceEth} ETH`);

  if (balance === 0n) {
    console.log('\n' + '!'.repeat(80));
    console.log('⛔ SALDO TESTNET ANDA MASIH 0 ETH');
    console.log('Transaksi on-chain publik memerlukan gas fee (gratis via faucet).');
    console.log('Silakan klaim testnet ETH gratis untuk alamat:');
    console.log(`👉 ${wallet.address}`);
    console.log('\nLink Faucet Resmi:');
    netConfig.faucets.forEach((f, i) => console.log(`   [${i + 1}] ${f}`));
    console.log('\nSetelah klaim berhasil, jalankan kembali:');
    console.log(`👉 npm run test:${networkKey === 'base-sepolia' ? 'base' : 'sepolia'}`);
    console.log('!'.repeat(80) + '\n');
    process.exit(0);
  }

  console.log(`\n✅ Saldo terdeteksi (${balanceEth} ETH). Memulai deployment & eksekusi on-chain...`);

  // 3. Deploy Contract to Public Testnet
  console.log(`\n[Deploy] Mengunggah OrderEscrow.sol ke ${netConfig.name}...`);
  const artifactPath = path.join(__dirname, 'out/OrderEscrow.sol/OrderEscrow.json');
  const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));

  const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode.object, wallet);
  const contract = await factory.deploy();
  console.log(`[Deploy] Tx Hash: ${netConfig.explorerTxUrl}${contract.deploymentTransaction().hash}`);
  console.log(`[Deploy] Menunggu konfirmasi penambangan blok publik...`);
  await contract.waitForDeployment();

  const contractAddress = await contract.getAddress();
  console.log(`[Deploy] 🎉 KONTRAK AKTIF DI TESTNET: ${contractAddress}`);
  console.log(`[Deploy] Explorer Kontrak: ${netConfig.explorerAddressUrl}${contractAddress}`);

  // 4. Initialize Relayer & Indexer
  const relayer = new TransactionRelayer(provider, wallet, contractAddress, artifact.abi, netConfig.explorerTxUrl);
  await relayer.initNonce();

  const indexer = new BlockchainIndexer(provider, contractAddress, artifact.abi, netConfig.requiredConfirmations, netConfig.explorerTxUrl);
  await indexer.start();

  // Test amount: 0.0001 ETH (very small to conserve testnet faucet funds)
  const testAmountEth = '0.0001';
  const orderId = `ORD-TESTNET-${Date.now().toString().slice(-4)}`;
  const merchantAddress = '0x90F79bf6EB2c4f870365E785982E1f101E93b906';

  // PHASE 1: Checkout
  console.log('\n--- [PHASE 1: Web2 E-Commerce Checkout] ---');
  db.createOrder({
    orderId,
    network: networkKey,
    customerId: 'CUST-TESTNET-1',
    merchantAddress,
    amountEth: testAmountEth
  });
  console.log(`[Database] Inserted order: ${orderId} (Status: PENDING_BROADCAST)`);

  // PHASE 2: Relayer Broadcast
  console.log('\n--- [PHASE 2: Relayer Nonce & On-Chain Broadcast] ---');
  const tx = await relayer.submitCreateOrder(orderId, merchantAddress, testAmountEth);
  console.log(`[EVM Network] Menunggu transaksi masuk blok...`);
  const receipt = await tx.wait(1);
  console.log(`[EVM Network] ✅ Mined in Block #${receipt.blockNumber}! Gas Used: ${receipt.gasUsed}`);

  // PHASE 3: Indexer Reconciliation
  console.log('\n--- [PHASE 3: Indexer Event Polling & DB Reconciliation] ---');
  console.log(`[Indexer] Menunggu konfirmasi blok (${netConfig.blockTimeSeconds}s per block)...`);
  await sleep(netConfig.blockTimeSeconds * 1000 * 2);
  await indexer.sync();

  const lockedOrder = db.getOrder(orderId);
  console.log(`[Database] Current Status: ${lockedOrder.status}`);

  // PHASE 4: Settlement Execution
  console.log('\n--- [PHASE 4: Delivery Confirmation & Escrow Release] ---');
  const settleTx = await relayer.submitReleasePayment(orderId);
  console.log(`[EVM Network] Menunggu settlement masuk blok...`);
  const settleReceipt = await settleTx.wait(1);
  console.log(`[EVM Network] ✅ Settled in Block #${settleReceipt.blockNumber}!`);

  await sleep(netConfig.blockTimeSeconds * 1000 * 2);
  await indexer.sync();

  // PHASE 5: Telemetry
  console.log('\n--- [PHASE 5: Final Telemetry & Verifikasi] ---');
  const finalOrder = db.getOrder(orderId);
  console.log(`Final Order Status in DB: ${finalOrder.status}`);
  console.log(`Transaction Hash:         ${netConfig.explorerTxUrl}${lockedOrder.txHash}`);
  console.log(`Settlement Hash:          ${netConfig.explorerTxUrl}${finalOrder.settlementTxHash}`);

  console.log('\n' + '='.repeat(80));
  console.log(`🎉 PATH 2 PUBLIC TESTNET RUN COMPLETED!`);
  console.log('='.repeat(80));

  indexer.stop();
  process.exit(0);
}

main().catch(err => {
  console.error('Fatal Testnet Error:', err);
  process.exit(1);
});
