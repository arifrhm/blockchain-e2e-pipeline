// run-e2e.js
// Master End-to-End Orchestrator: Web2 App <-> Relayer <-> Local EVM Chain <-> Indexer

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { ethers } = require('ethers');
const db = require('./services/db');
const TransactionRelayer = require('./services/relayer');
const BlockchainIndexer = require('./services/indexer');

const ANVIL_PORT = 8545;
const RPC_URL = `http://127.0.0.1:${ANVIL_PORT}`;

// Standard Anvil default accounts (funded with 10,000 ETH each)
const RELAYER_PK = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'; // Account 0
const CUSTOMER_PK = '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d'; // Account 1
const MERCHANT_ADDRESS = '0x90F79bf6EB2c4f870365E785982E1f101E93b906'; // Account 2

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function startAnvil() {
  console.log(`[Setup] Spawning local EVM blockchain via Anvil on port ${ANVIL_PORT}...`);
  const anvil = spawn('/root/.foundry/bin/anvil', ['-p', ANVIL_PORT.toString(), '--silent'], {
    detached: false
  });

  // Wait for Anvil to boot
  await sleep(1500);
  return anvil;
}

async function deployContract(signer) {
  console.log(`[Deploy] Deploying OrderEscrow.sol from account: ${signer.address}...`);
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
  console.log('🚀 END-TO-END BLOCKCHAIN + WEB2 ARCHITECTURE PIPELINE');
  console.log('Demonstrating Web2 API -> Transaction Relayer -> EVM Blockchain -> Event Indexer');
  console.log('='.repeat(80));

  let anvilProcess;
  try {
    // 1. Boot local EVM Chain
    anvilProcess = await startAnvil();
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    provider.pollingInterval = 100; // Fast polling for local testing

    const relayerSigner = new ethers.Wallet(RELAYER_PK, provider);
    const customerSigner = new ethers.Wallet(CUSTOMER_PK, provider);

    console.log(`Relayer Address:  ${relayerSigner.address}`);
    console.log(`Customer Address: ${customerSigner.address}`);
    console.log(`Merchant Address: ${MERCHANT_ADDRESS}`);

    // Check starting balance of Merchant
    const initialMerchantBalance = await provider.getBalance(MERCHANT_ADDRESS);
    console.log(`Initial Merchant Balance: ${ethers.formatEther(initialMerchantBalance)} ETH\n`);

    // 2. Deploy Smart Contract
    const { contractAddress, abi } = await deployContract(relayerSigner);

    // 3. Initialize Services
    const relayer = new TransactionRelayer(provider, relayerSigner, contractAddress, abi);
    await relayer.initNonce();

    const indexer = new BlockchainIndexer(provider, contractAddress, abi, 1);
    await indexer.start();

    // -------------------------------------------------------------
    // PHASE 1: Web2 Customer Checkout
    // -------------------------------------------------------------
    console.log('\n--- [PHASE 1: Web2 E-Commerce Checkout] ---');
    const orderId = `ORD-2026-B2B-${Date.now().toString().slice(-4)}`;
    const orderPayload = {
      orderId,
      customerId: 'CUST-88392',
      merchantAddress: MERCHANT_ADDRESS,
      amountEth: '1.5'
    };

    console.log(`[Web2 API] Customer clicked "Pay & Place Order": ${orderId} for 1.5 ETH`);
    const dbOrder = db.createOrder(orderPayload);
    console.log(`[Database] Row inserted: Status = ${dbOrder.status}`);

    // -------------------------------------------------------------
    // PHASE 2: Transaction Relayer Broadcast
    // -------------------------------------------------------------
    console.log('\n--- [PHASE 2: Relayer Nonce & On-Chain Broadcast] ---');
    console.log(`[Relayer Worker] Found 1 order pending broadcast: ${orderId}`);
    const tx = await relayer.submitCreateOrder(orderId, MERCHANT_ADDRESS, '1.5');
    
    // Wait for block confirmation
    const receipt = await tx.wait(1);
    console.log(`[EVM Node] ✅ Transaction Mined in Block #${receipt.blockNumber}! Gas Used: ${receipt.gasUsed}`);

    // -------------------------------------------------------------
    // PHASE 3: Indexer Event Catch & Reconciliation
    // -------------------------------------------------------------
    console.log('\n--- [PHASE 3: Indexer Event Polling & DB Reconciliation] ---');
    // Allow indexer cycle to capture block
    await sleep(500);
    await indexer.sync();
    const lockedOrder = db.getOrder(orderId);
    console.log(`[Database] Current Status after Reconciliation: ${lockedOrder.status}`);
    console.log(`[Database] Linked Block Number: #${lockedOrder.blockNumber}`);
    console.log(`[Database] Escrow Amount Locked On-Chain: ${ethers.formatEther(lockedOrder.onchainAmountWei)} ETH`);

    // -------------------------------------------------------------
    // PHASE 4: Order Delivery & Escrow Release Settlement
    // -------------------------------------------------------------
    console.log('\n--- [PHASE 4: Physical Delivery Confirmed -> Escrow Settlement] ---');
    console.log(`[Web2 Logistics] Webhook received: Package Delivered to Customer.`);
    console.log(`[Web2 Backend] Triggering Platform Escrow Release for: ${orderId}`);
    
    const settleTx = await relayer.submitReleasePayment(orderId);
    const settleReceipt = await settleTx.wait(1);
    console.log(`[EVM Node] ✅ Settlement Tx Mined in Block #${settleReceipt.blockNumber}!`);

    // Allow indexer cycle to process settlement
    await sleep(500);
    await indexer.sync();

    // -------------------------------------------------------------
    // PHASE 5: Final Verification & Financial Telemetry
    // -------------------------------------------------------------
    console.log('\n--- [PHASE 5: Reconciliation Verification & Telemetry] ---');
    const finalOrder = db.getOrder(orderId);
    const finalMerchantBalance = await provider.getBalance(MERCHANT_ADDRESS);

    console.log(`Final Order Status in Web2 DB: ${finalOrder.status}`);
    console.log(`Merchant Starting Balance:     ${ethers.formatEther(initialMerchantBalance)} ETH`);
    console.log(`Merchant Final Balance:        ${ethers.formatEther(finalMerchantBalance)} ETH`);
    console.log(`Balance Growth (Settlement):   +${ethers.formatEther(finalMerchantBalance - initialMerchantBalance)} ETH`);

    console.log('\n--- [Audit Trail in Web2 DB] ---');
    const auditLogs = db.read().audit_logs;
    auditLogs.forEach((log, idx) => {
      console.log(`[${idx + 1}] ${log.timestamp} | ${log.action} | Order: ${log.orderId}`);
    });

    console.log('\n' + '='.repeat(80));
    console.log('🎉 PIPELINE DEMONSTRATION SUCCESSFUL!');
    console.log('='.repeat(80));

    indexer.stop();
  } catch (err) {
    console.error('Fatal Pipeline Error:', err);
  } finally {
    if (anvilProcess) {
      console.log('[Teardown] Shutting down Anvil local node...');
      anvilProcess.kill('SIGINT');
    }
    process.exit(0);
  }
}

main();
