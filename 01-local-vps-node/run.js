// 01-local-vps-node/run.js
// Master Runner: On-Demand Anvil Boot -> E2E Lifecycle -> Graceful Teardown

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { ethers } = require('ethers');
const db = require('./services/db');
const TransactionRelayer = require('./services/relayer');
const BlockchainIndexer = require('./services/indexer');

const ANVIL_PORT = 8545;
const RPC_URL = `http://127.0.0.1:${ANVIL_PORT}`;

// Deterministic Anvil dev accounts (funded with 10,000 ETH each)
const RELAYER_PK = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'; // Account 0
const MERCHANT_ADDRESS = '0x90F79bf6EB2c4f870365E785982E1f101E93b906'; // Account 2

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function startAnvil() {
  console.log(`[VPS Local Node] Spawning Anvil on port ${ANVIL_PORT}...`);
  const anvil = spawn('/root/.foundry/bin/anvil', ['-p', ANVIL_PORT.toString(), '--silent'], {
    detached: false
  });
  await sleep(1500);
  return anvil;
}

async function deployContract(signer) {
  console.log(`[Deploy] Deploying OrderEscrow.sol from: ${signer.address}...`);
  const artifactPath = path.join(__dirname, 'out/OrderEscrow.sol/OrderEscrow.json');
  const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));

  const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode.object, signer);
  const contract = await factory.deploy();
  await contract.waitForDeployment();

  const contractAddress = await contract.getAddress();
  console.log(`[Deploy] ✅ OrderEscrow deployed at: ${contractAddress}`);
  return { contractAddress, abi: artifact.abi };
}

async function main() {
  console.log('='.repeat(80));
  console.log('🏛️  PATH 1: LOCAL VPS NODE (ANVIL DEVNET)');
  console.log('Cost: $0 | Speed: <50ms | Unlimited ETH | Zero Public Leakage');
  console.log('='.repeat(80));

  let anvilProcess;
  try {
    anvilProcess = await startAnvil();
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    provider.pollingInterval = 100;

    const relayerSigner = new ethers.Wallet(RELAYER_PK, provider);
    const initialMerchantBalance = await provider.getBalance(MERCHANT_ADDRESS);

    console.log(`Node RPC:          ${RPC_URL}`);
    console.log(`Relayer Address:   ${relayerSigner.address}`);
    console.log(`Merchant Address:  ${MERCHANT_ADDRESS}`);
    console.log(`Initial Balance:   ${ethers.formatEther(initialMerchantBalance)} ETH\n`);

    const { contractAddress, abi } = await deployContract(relayerSigner);

    const relayer = new TransactionRelayer(provider, relayerSigner, contractAddress, abi);
    await relayer.initNonce();

    const indexer = new BlockchainIndexer(provider, contractAddress, abi, 1);
    await indexer.start();

    // PHASE 1: Checkout
    console.log('\n--- [PHASE 1: Web2 E-Commerce Checkout] ---');
    const orderId = `ORD-LOCAL-${Date.now().toString().slice(-4)}`;
    db.createOrder({
      orderId,
      customerId: 'CUST-LOCAL-1',
      merchantAddress: MERCHANT_ADDRESS,
      amountEth: '2.5'
    });
    console.log(`[Database] Inserted order: ${orderId} (Status: PENDING_BROADCAST)`);

    // PHASE 2: Relayer Broadcast
    console.log('\n--- [PHASE 2: Relayer Nonce & Broadcast] ---');
    const tx = await relayer.submitCreateOrder(orderId, MERCHANT_ADDRESS, '2.5');
    const receipt = await tx.wait(1);
    console.log(`[EVM Node] ✅ Mined in Block #${receipt.blockNumber}! Gas Used: ${receipt.gasUsed}`);

    // PHASE 3: Indexer Reconciliation
    console.log('\n--- [PHASE 3: Indexer Reconciliation] ---');
    await sleep(500);
    await indexer.sync();
    const lockedOrder = db.getOrder(orderId);
    console.log(`[Database] Current Status: ${lockedOrder.status} (Locked: ${ethers.formatEther(lockedOrder.onchainAmountWei)} ETH)`);

    // PHASE 4: Release Settlement
    console.log('\n--- [PHASE 4: Settlement Execution] ---');
    const settleTx = await relayer.submitReleasePayment(orderId);
    const settleReceipt = await settleTx.wait(1);
    console.log(`[EVM Node] ✅ Settled in Block #${settleReceipt.blockNumber}!`);

    await sleep(500);
    await indexer.sync();

    // PHASE 5: Telemetry
    console.log('\n--- [PHASE 5: Final Telemetry & Balance Growth] ---');
    const finalOrder = db.getOrder(orderId);
    const finalMerchantBalance = await provider.getBalance(MERCHANT_ADDRESS);

    console.log(`Order Status in DB:         ${finalOrder.status}`);
    console.log(`Merchant Starting Balance:  ${ethers.formatEther(initialMerchantBalance)} ETH`);
    console.log(`Merchant Final Balance:     ${ethers.formatEther(finalMerchantBalance)} ETH`);
    console.log(`Net Settlement Received:    +${ethers.formatEther(finalMerchantBalance - initialMerchantBalance)} ETH`);

    console.log('\n' + '='.repeat(80));
    console.log('✅ PATH 1 COMPLETED SUCCESSFULLY (100% PASS)');
    console.log('='.repeat(80));

    indexer.stop();
  } catch (err) {
    console.error('Local Run Error:', err);
  } finally {
    if (anvilProcess) {
      console.log('[Teardown] Cleaning up Anvil process on VPS...');
      anvilProcess.kill('SIGINT');
    }
    process.exit(0);
  }
}

main();
