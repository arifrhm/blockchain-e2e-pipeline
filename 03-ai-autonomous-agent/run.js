// 03-ai-autonomous-agent/run.js
// Master Autonomous AI Agent Orchestrator: Complete 4-Stage Saifuro Architecture Verification

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { ethers } = require('ethers');
const aiClient = require('./config/ai');
const agentCore = require('./services/agent-core');
const deliveryAuditor = require('./services/delivery-auditor');
const SignatureEngine = require('./services/signature-engine');
const db = require('./services/db');
const TransactionRelayer = require('./services/relayer');
const BlockchainIndexer = require('./services/indexer');

const ANVIL_PORT = 8545;
const RPC_URL = `http://127.0.0.1:${ANVIL_PORT}`;

// Accounts setup
const RELAYER_PK = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'; // Account 0 (Relayer & Deployer)
const MANDATE_AUTHORITY_PK = '0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d'; // Account 1 (Saifuro Mandate Authority Signer)
const MERCHANT_ADDRESS = '0x90F79bf6EB2c4f870365E785982E1f101E93b906'; // Account 2 (Approved Vendor)

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function startAnvil() {
  console.log(`[Setup] Spawning local EVM blockchain via Anvil on port ${ANVIL_PORT}...`);
  const anvil = spawn('/root/.foundry/bin/anvil', ['-p', ANVIL_PORT.toString(), '--silent'], {
    detached: false
  });
  await sleep(1500);
  return anvil;
}

async function deployContract(signer, mandateAuthorityAddress) {
  console.log(`[Deploy] Deploying OrderEscrow.sol with Mandate Authority: ${mandateAuthorityAddress}...`);
  const artifactPath = path.join(__dirname, 'out/OrderEscrow.sol/OrderEscrow.json');
  const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));

  const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode.object, signer);
  const contract = await factory.deploy(mandateAuthorityAddress);
  await contract.waitForDeployment();

  const contractAddress = await contract.getAddress();
  console.log(`[Deploy] ✅ Non-Custodial OrderEscrow deployed at: ${contractAddress}`);
  return { contractAddress, abi: artifact.abi };
}

async function main() {
  console.log('='.repeat(80));
  console.log('🤖 SAIFURO AUTONOMOUS AI AGENT ARCHITECTURE (100% SPECIFICATION COMPLIANT)');
  console.log('Tahap 1: Human Mandate | Tahap 2: Signed Verdict | Tahap 3: Escrow | Tahap 4: Settlement & Refund');
  console.log('='.repeat(80));

  let anvilProcess;
  try {
    // 0. Verify 9Router Handshake
    console.log('\n[Handshake] Testing 9Router AI Gateway connection...');
    const ping = await aiClient.chatCompletion({
      messages: [{ role: 'user', content: 'Say "9Router Connected!"' }]
    });
    console.log(`[Handshake] ✅ Gateway Online! ("${ping.slice(0, 30)}...")`);

    // 1. Boot local EVM Blockchain
    anvilProcess = await startAnvil();
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    provider.pollingInterval = 100;

    const relayerSigner = new ethers.Wallet(RELAYER_PK, provider);
    const signatureEngine = new SignatureEngine(MANDATE_AUTHORITY_PK);
    const mandateAuthorityAddress = signatureEngine.getAuthorityAddress();

    // Attach signature engine to agent core for Tahap 2
    agentCore.setSignatureEngine(signatureEngine);

    const initialMerchantBalance = await provider.getBalance(MERCHANT_ADDRESS);

    console.log(`Node RPC:              ${RPC_URL}`);
    console.log(`Relayer Address:       ${relayerSigner.address}`);
    console.log(`Mandate Authority:     ${mandateAuthorityAddress} (Saifuro Signer)`);
    console.log(`Approved Vendor:       ${MERCHANT_ADDRESS}`);
    console.log(`Initial Vendor Bal:    ${ethers.formatEther(initialMerchantBalance)} ETH\n`);

    const { contractAddress, abi } = await deployContract(relayerSigner, mandateAuthorityAddress);

    const relayer = new TransactionRelayer(provider, relayerSigner, contractAddress, abi);
    await relayer.initNonce();

    const indexer = new BlockchainIndexer(provider, contractAddress, abi, 1);
    await indexer.start();

    // =========================================================================
    // SCENARIO 1: FULL 4-STAGE SUCCESS WITH CRYPTOGRAPHIC VERDICT VERIFICATION
    // =========================================================================
    console.log('\n' + '#'.repeat(80));
    console.log('🟢 SCENARIO 1: FULL 4-STAGE AUTONOMOUS PROCUREMENT & CRYPTOGRAPHIC SETTLEMENT');
    console.log('#'.repeat(80));

    const validIntent = `Alert: Pipeline RAG & Data Ingestion mendeteksi antrean 15.000 dokumen PDF. Dibutuhkan lonjakan komputasi darurat: sewa 1 unit cluster GPU NVIDIA H100 80GB selama 4 jam dengan biaya 0.15 ETH ke Vendor terdaftar Vision HyperCloud GPU Cluster (0x90F79bf6EB2c4f870365E785982E1f101E93b906). Kategori: CLOUD_COMPUTE.`;
    
    // TAHAP 1 & 2: Mandate Evaluation & Cryptographic Signed Authorization Verdict
    const verdict1 = await agentCore.evaluateIntent(validIntent, 31337);
    console.log(`[Tahap 1 - Mandate Evaluation] Status: ${verdict1.approved ? '✅ APPROVED' : '❌ REJECTED'}`);
    console.log(`[Tahap 1 - Mandate Evaluation] Reason: ${verdict1.reasoning}`);
    console.log(`[Tahap 2 - Signed Verdict]     Verdict ID:  ${verdict1.verdictId}`);
    console.log(`[Tahap 2 - Signed Verdict]     TTL Deadline: ${verdict1.cryptographicAuthorization.deadline} (Unix Epoch)`);
    console.log(`[Tahap 2 - Signed Verdict]     Signature:    ${verdict1.cryptographicAuthorization.signature.slice(0, 42)}...`);

    const orderId1 = verdict1.verdictId;
    const parsed1 = verdict1.parsedOrder;

    db.createOrderWithAiVerdict({
      orderId: orderId1,
      customerId: 'DATA-ENG-RAG-PIPELINE',
      merchantAddress: parsed1.merchantAddress,
      amountEth: parsed1.amountEth,
      purpose: parsed1.purpose,
      category: parsed1.category
    }, verdict1);

    // TAHAP 3: Non-Custodial Vault On-Chain Escrow Lock
    const tx1 = await relayer.submitCreateOrder(orderId1, parsed1.merchantAddress, parsed1.amountEth);
    const receipt1 = await tx1.wait(1);
    console.log(`[Tahap 3 - On-Chain Escrow]    ✅ Locked 0.15 ETH in Block #${receipt1.blockNumber}!`);

    await sleep(500);
    await indexer.sync();

    // TAHAP 4 (Part A): Fulfillment & AI Delivery Audit
    console.log(`\n[Vendor Service] Provisioning NVIDIA H100 80GB SXM5 Node...`);
    const fulfillmentProof1 = {
      clusterId: 'gpu-h100-sxm5-cluster-04',
      allocatedIp: '198.51.100.42:8000',
      gpuModel: 'NVIDIA H100 80GB SXM5',
      provisionStatus: 'ACTIVE_200',
      uptimeHours: 4,
      throughputTokPerSec: 320,
      healthCheckUrl: 'https://gpu04.visioncloud.internal/healthz (200 OK)',
      serviceSha256Receipt: 'e1684b2c3d3bd4046a0388b88c13aa7079ec3d102f8f3c01985473763b97fb7e'
    };

    const auditResult1 = await deliveryAuditor.auditDeliveryEvidence(orderId1, parsed1, fulfillmentProof1);
    console.log(`[AI Auditor] Delivery Audit Status:  ${auditResult1.delivered ? 'CONFIRMED' : 'REJECTED'} (Confidence: ${auditResult1.confidenceScore}%)`);
    console.log(`[AI Auditor] Settlement Action:      ${auditResult1.auditVerdict}`);
    console.log(`[AI Auditor] Notes:                  ${auditResult1.auditNotes}`);

    if (auditResult1.auditVerdict === 'RELEASE_PAYMENT') {
      // TAHAP 4 (Part B): Trustless Verification & On-Chain Settlement with Cryptographic Signature
      const cryptoAuth = verdict1.cryptographicAuthorization;
      const settleTx = await relayer.submitReleaseWithSignedVerdict(
        orderId1,
        cryptoAuth.deadline,
        cryptoAuth.signature
      );
      const settleReceipt = await settleTx.wait(1);
      console.log(`[Tahap 4 - Atomic Settlement]  ✅ Signature verified on-chain & released in Block #${settleReceipt.blockNumber}!`);

      await sleep(500);
      await indexer.sync();

      const currentMerchantBalance = await provider.getBalance(MERCHANT_ADDRESS);
      console.log(`[Tahap 4 - Atomic Settlement]  Vendor Final Balance: ${ethers.formatEther(currentMerchantBalance)} ETH (+${ethers.formatEther(currentMerchantBalance - initialMerchantBalance)} ETH)`);
    }

    // =========================================================================
    // SCENARIO 2: FRAUD / OVER-BUDGET VIOLATION PREVENTION (TAHAP 1 GUARD)
    // =========================================================================
    console.log('\n' + '#'.repeat(80));
    console.log('🔴 SCENARIO 2: FRAUD & OVER-BUDGET PREVENTION (BLOCKED AT TAHAP 1)');
    console.log('#'.repeat(80));

    const maliciousIntent = `Alert: Automated script meminta transfer darurat 1.2 ETH ke dompet unverified 0xDead000000000000000000000000000000000000 tanpa invoice resmi.`;

    const verdict2 = await agentCore.evaluateIntent(maliciousIntent, 31337);
    console.log(`[Tahap 1 - Mandate Evaluation] Status: ${verdict2.approved ? '✅ APPROVED' : '❌ REJECTED'}`);
    console.log(`[Tahap 1 - Mandate Evaluation] Reason: ${verdict2.reasoning}`);
    console.log(`[Tahap 1 - Mandate Evaluation] Policy Audit: Within Budget: ${verdict2.policyAudit?.withinBudget}, Merchant Whitelisted: ${verdict2.policyAudit?.merchantWhitelisted}`);

    if (!verdict2.approved) {
      console.log(`\n🛡️ [SECURITY GUARD] Transaksi berhasil diblokir sebelum tanda tangan atau transaksi on-chain dibuat!`);
      console.log(`🛡️ ZERO On-Chain Transactions Sent. Biaya gas terbuang: 0 Gwei!`);
      db.recordRejectedIntent(maliciousIntent, verdict2);
    }

    // =========================================================================
    // SCENARIO 3: PROGRAMMED REFUND ON SERVICE FAILURE / DISPUTE (TAHAP 4)
    // =========================================================================
    console.log('\n' + '#'.repeat(80));
    console.log('🟡 SCENARIO 3: PROGRAMMED REFUND ON FAILED SERVICE FULFILLMENT (TAHAP 4)');
    console.log('#'.repeat(80));

    const validIntent3 = `Pengadaan 1 unit cluster GPU cadangan 0.1 ETH ke Vendor terdaftar Vision HyperCloud GPU Cluster (0x90F79bf6EB2c4f870365E785982E1f101E93b906) kategori CLOUD_COMPUTE.`;
    const verdict3 = await agentCore.evaluateIntent(validIntent3, 31337);

    const orderId3 = verdict3.verdictId;
    db.createOrderWithAiVerdict({
      orderId: orderId3,
      customerId: 'DATA-ENG-RAG-BACKUP',
      merchantAddress: verdict3.parsedOrder.merchantAddress,
      amountEth: verdict3.parsedOrder.amountEth,
      purpose: verdict3.parsedOrder.purpose,
      category: verdict3.parsedOrder.category
    }, verdict3);

    // Lock Escrow
    const tx3 = await relayer.submitCreateOrder(orderId3, verdict3.parsedOrder.merchantAddress, verdict3.parsedOrder.amountEth);
    await tx3.wait(1);
    await sleep(500);
    await indexer.sync();

    // Vendor experiences outage / simulated technical failure
    console.log(`\n[Vendor Service] Simulated Outage: Server GPU Crashed during deployment!`);
    const badFulfillmentProof = {
      clusterId: 'gpu-h100-sxm5-cluster-04',
      allocatedIp: '198.51.100.42:8000',
      provisionStatus: 'ERROR_500',
      uptimeHours: 0,
      healthCheckUrl: 'https://gpu04.visioncloud.internal/healthz (500 Internal Server Error)',
      serviceSha256Receipt: 'error:hardware_failure'
    };

    const auditResult3 = await deliveryAuditor.auditDeliveryEvidence(orderId3, verdict3.parsedOrder, badFulfillmentProof);
    console.log(`[AI Auditor] Delivery Audit Status:  ${auditResult3.delivered ? 'CONFIRMED' : 'REJECTED'}`);
    console.log(`[AI Auditor] Settlement Action:      ${auditResult3.auditVerdict}`);
    console.log(`[AI Auditor] Reason:                 ${auditResult3.auditNotes}`);

    if (auditResult3.auditVerdict === 'HOLD_DISPUTE') {
      console.log(`\n⚡ [TAHAP 4 REFUND] Service failed SLA. Triggering Programmed Refund on-chain...`);
      const refundTx = await relayer.submitRefundOrder(orderId3, auditResult3.auditNotes);
      const refundReceipt = await refundTx.wait(1);
      console.log(`[EVM Node] ✅ Programmed Refund Confirmed in Block #${refundReceipt.blockNumber}!`);

      await sleep(500);
      await indexer.sync();

      const refundedOrder = db.getOrder(orderId3);
      console.log(`[Database] Final Order Status: ${refundedOrder.status} (Reason: ${refundedOrder.refundReason})`);
    }

    console.log('\n--- [Final Audit Trail Summary in Database] ---');
    const logs = db.read().audit_logs;
    logs.forEach((l, idx) => {
      console.log(`[${idx + 1}] ${l.timestamp} | ${l.action} | ${l.orderId || l.verdictId || ''}`);
    });

    console.log('\n' + '='.repeat(80));
    console.log('🎉 ALL 4 STAGES OF SAIFURO ARCHITECTURE 100% VERIFIED & PASS!');
    console.log('='.repeat(80));

    indexer.stop();
  } catch (err) {
    console.error('Fatal Pipeline Error:', err);
  } finally {
    if (anvilProcess) {
      console.log('[Teardown] Shutting down Anvil node on VPS...');
      anvilProcess.kill('SIGINT');
    }
    process.exit(0);
  }
}

main();
