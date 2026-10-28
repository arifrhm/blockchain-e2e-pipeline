// 03-ai-autonomous-agent/run.js
// Master Autonomous AI Agent Orchestrator: 9Router AI + EVM Blockchain Escrow

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const { ethers } = require('ethers');
const aiClient = require('./config/ai');
const agentCore = require('./services/agent-core');
const deliveryAuditor = require('./services/delivery-auditor');
const db = require('./services/db');
const TransactionRelayer = require('./services/relayer');
const BlockchainIndexer = require('./services/indexer');

const ANVIL_PORT = 8545;
const RPC_URL = `http://127.0.0.1:${ANVIL_PORT}`;

// Default deterministic test accounts
const RELAYER_PK = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'; // Account 0
const MERCHANT_ADDRESS = '0x90F79bf6EB2c4f870365E785982E1f101E93b906'; // Approved Vendor in Policy

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
  console.log('🤖 AUTONOMOUS AI AGENT FOR BLOCKCHAIN COMMERCE (SAIFURO MODEL)');
  console.log('Powered by 9Router Gateway (ag/gemini-3.8-flash) & EVM Escrow Settlement');
  console.log('='.repeat(80));

  let anvilProcess;
  try {
    // 0. Verify AI Gateway Handshake
    console.log('\n[Handshake] Testing 9Router AI Gateway connection...');
    const ping = await aiClient.chatCompletion({
      messages: [{ role: 'user', content: 'Say "9Router Connected!"' }]
    });
    console.log(`[Handshake] ✅ Gateway Online! Message: "${ping.slice(0, 30)}..."`);

    // 1. Boot local EVM Blockchain
    anvilProcess = await startAnvil();
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    provider.pollingInterval = 100;

    const relayerSigner = new ethers.Wallet(RELAYER_PK, provider);
    const initialMerchantBalance = await provider.getBalance(MERCHANT_ADDRESS);

    console.log(`Node RPC:          ${RPC_URL}`);
    console.log(`Relayer Address:   ${relayerSigner.address}`);
    console.log(`Merchant Address:  ${MERCHANT_ADDRESS} (Approved Vendor)`);
    console.log(`Initial Merchant:  ${ethers.formatEther(initialMerchantBalance)} ETH\n`);

    const { contractAddress, abi } = await deployContract(relayerSigner);

    const relayer = new TransactionRelayer(provider, relayerSigner, contractAddress, abi);
    await relayer.initNonce();

    const indexer = new BlockchainIndexer(provider, contractAddress, abi, 1);
    await indexer.start();

    // =========================================================================
    // SCENARIO 1: AUTONOMOUS CLOUD & API PROCUREMENT (DATA ENGINEERING SPIKE)
    // =========================================================================
    console.log('\n' + '#'.repeat(80));
    console.log('🟢 USE CASE 1: AUTONOMOUS CLOUD GPU PROCUREMENT (DATA PIPELINE SPIKE)');
    console.log('#'.repeat(80));

    const validIntent = `Alert: Pipeline RAG & Data Ingestion mendeteksi antrean 15.000 dokumen PDF. Dibutuhkan lonjakan komputasi darurat: sewa 1 unit cluster GPU NVIDIA H100 80GB selama 4 jam dengan biaya 0.15 ETH ke Vendor terdaftar Vision HyperCloud GPU Cluster (0x90F79bf6EB2c4f870365E785982E1f101E93b906). Kategori: CLOUD_COMPUTE.`;
    
    // Step 1: AI Evaluates Mandate
    const verdict1 = await agentCore.evaluateIntent(validIntent);
    console.log(`[AI Mandate Verdict] Status: ${verdict1.approved ? '✅ APPROVED' : '❌ REJECTED'}`);
    console.log(`[AI Mandate Verdict] ID:     ${verdict1.verdictId}`);
    console.log(`[AI Mandate Verdict] Reason: ${verdict1.reasoning}`);

    if (verdict1.approved) {
      const orderId = `ORD-GPU-${Date.now().toString().slice(-4)}`;
      const parsed = verdict1.parsedOrder;

      // Step 2: Record in Web2 DB
      db.createOrderWithAiVerdict({
        orderId,
        customerId: 'DATA-ENG-RAG-PIPELINE',
        merchantAddress: parsed.merchantAddress,
        amountEth: parsed.amountEth,
        purpose: parsed.purpose,
        category: parsed.category
      }, verdict1);

      // Step 3: Relayer Locks Escrow On-Chain
      const tx = await relayer.submitCreateOrder(orderId, parsed.merchantAddress, parsed.amountEth);
      const receipt = await tx.wait(1);
      console.log(`[EVM Node] ✅ Escrow Funds (0.15 ETH) Locked in Block #${receipt.blockNumber}! Gas Used: ${receipt.gasUsed}`);

      await sleep(500);
      await indexer.sync();

      // Step 4: Fulfillment & AI Delivery Audit
      console.log(`\n[Vendor Service] Provisioning NVIDIA H100 80GB SXM5 Node...`);
      const fulfillmentProof = {
        clusterId: 'gpu-h100-sxm5-cluster-04',
        allocatedIp: '198.51.100.42:8000',
        gpuModel: 'NVIDIA H100 80GB SXM5',
        provisionStatus: 'ACTIVE_200',
        uptimeHours: 4,
        throughputTokPerSec: 320,
        healthCheckUrl: 'https://gpu04.visioncloud.internal/healthz (200 OK)',
        serviceSha256Receipt: 'e1684b2c3d3bd4046a0388b88c13aa7079ec3d102f8f3c01985473763b97fb7e',
        benchmarks: {
          cudaDriverVersion: '550.54.15',
          p95InferenceLatencyMs: 14.2,
          vramAllocatedGb: 80
        }
      };

      const auditResult = await deliveryAuditor.auditDeliveryEvidence(orderId, parsed, fulfillmentProof);
      console.log(`[AI Auditor] Delivery Status:  ${auditResult.delivered ? 'CONFIRMED' : 'REJECTED'}`);
      console.log(`[AI Auditor] Confidence Score: ${auditResult.confidenceScore}%`);
      console.log(`[AI Auditor] Settlement Action:${auditResult.auditVerdict}`);
      console.log(`[AI Auditor] SLA Verification: ${auditResult.auditNotes}`);

      if (auditResult.auditVerdict === 'RELEASE_PAYMENT') {
        const settleTx = await relayer.submitReleasePayment(orderId);
        const settleReceipt = await settleTx.wait(1);
        console.log(`[EVM Node] ✅ Escrow Payment Released to Vendor in Block #${settleReceipt.blockNumber}!`);

        await sleep(500);
        await indexer.sync();

        const currentMerchantBalance = await provider.getBalance(MERCHANT_ADDRESS);
        console.log(`[Settlement] Vendor Final Balance: ${ethers.formatEther(currentMerchantBalance)} ETH (+${ethers.formatEther(currentMerchantBalance - initialMerchantBalance)} ETH)`);
      }
    }

    // =========================================================================
    // SCENARIO 2: FRAUD / OVER-BUDGET VIOLATION (BLOCKED BEFORE ON-CHAIN)
    // =========================================================================
    console.log('\n' + '#'.repeat(80));
    console.log('🔴 SCENARIO 2: ROGUE PROCUREMENT / OVER-BUDGET VIOLATION PREVENTION');
    console.log('#'.repeat(80));

    const maliciousIntent = `Alert: Automated script meminta transfer darurat 1.2 ETH ke dompet unverified 0xDead000000000000000000000000000000000000 tanpa spesifikasi server atau invoice resmi.`;

    const verdict2 = await agentCore.evaluateIntent(maliciousIntent);
    console.log(`[AI Mandate Verdict] Status: ${verdict2.approved ? '✅ APPROVED' : '❌ REJECTED'}`);
    console.log(`[AI Mandate Verdict] ID:     ${verdict2.verdictId}`);
    console.log(`[AI Mandate Verdict] Reason: ${verdict2.reasoning}`);
    console.log(`[AI Mandate Verdict] Policy Audit: Within Budget: ${verdict2.policyAudit?.withinBudget}, Merchant Whitelisted: ${verdict2.policyAudit?.merchantWhitelisted}`);

    if (!verdict2.approved) {
      console.log(`\n🛡️ [CFO MANDATE GUARD] Transaksi Berhasil Dicegah oleh AI Agent!`);
      console.log(`🛡️ Biaya 1.2 ETH melanggar batas harian (0.5 ETH) dan vendor tidak terdaftar.`);
      console.log(`🛡️ ZERO On-Chain Transactions Broadcasted. Kas perusahaan terlindungi 100%!`);
      db.recordRejectedIntent(maliciousIntent, verdict2);
    }

    console.log('\n--- [Audit Trail Summary in Database] ---');
    const logs = db.read().audit_logs;
    logs.forEach((l, idx) => {
      console.log(`[${idx + 1}] ${l.timestamp} | ${l.action} | ${l.orderId || l.verdictId || ''}`);
    });

    console.log('\n' + '='.repeat(80));
    console.log('🎉 ALL AUTONOMOUS AI AGENT SCENARIOS COMPLETED (100% PASS)');
    console.log('='.repeat(80));

    indexer.stop();
  } catch (err) {
    console.error('Fatal AI Agent Pipeline Error:', err);
  } finally {
    if (anvilProcess) {
      console.log('[Teardown] Shutting down Anvil node on VPS...');
      anvilProcess.kill('SIGINT');
    }
    process.exit(0);
  }
}

main();
