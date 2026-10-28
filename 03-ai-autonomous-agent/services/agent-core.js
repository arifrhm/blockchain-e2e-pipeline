// 03-ai-autonomous-agent/services/agent-core.js
// Autonomous AI Agent Core: Evaluates Natural Language Intent against Human Mandates
// Implements Tahap 2: Signed Authorization Verdict with Cryptographic EIP-191 / ECDSA Signature

const aiClient = require('../config/ai');
const policy = require('../config/policy');

class AutonomousAgentCore {
  constructor() {
    this.policy = policy;
    this.signatureEngine = null;
  }

  setSignatureEngine(signatureEngine) {
    this.signatureEngine = signatureEngine;
  }

  /**
   * Evaluates a procurement intent and generates a formal Signed Authorization Verdict
   */
  async evaluateIntent(intentText, chainId = 31337) {
    console.log(`\n[AI Agent] Evaluating Business Intent via 9Router (ag/gemini-3.8-flash)...`);
    console.log(`[AI Agent] Intent: "${intentText}"`);

    const systemPrompt = `Anda adalah Autonomous Web3 Compliance & Procurement Agent (seperti arsitektur Saifuro).
Tugas Anda adalah mengevaluasi apakah permintaan pengeluaran dana (procurement intent) dari pengguna/sistem mematuhi HUMAN MANDATE (Kebijakan Anggaran & Whitelist) berikut:

--- HUMAN MANDATE POLICY (Tahap 1) ---
1. Max Expenditure per Transaction: ${this.policy.MAX_TRANSACTION_ETH} ETH
2. Daily Budget Cap: ${this.policy.MAX_DAILY_BUDGET_ETH} ETH
3. Transaction TTL Expiration: ${this.policy.TRANSACTION_TTL_SECONDS} detik
4. Approved Vendors:
${JSON.stringify(this.policy.APPROVED_VENDORS, null, 2)}
5. Allowed Categories: ${JSON.stringify(this.policy.ALLOWED_CATEGORIES)}

--- ATURAN EVALUASI ---
- Jika jumlah ETH yang diminta melebihi ${this.policy.MAX_TRANSACTION_ETH} ETH, Anda WAJIB menolak (approved: false).
- Jika alamat merchant tujuan TIDAK ADA dalam Approved Vendors, Anda WAJIB menolak (approved: false).
- Jika tujuan transaksi mencurigakan, tidak ada konteks yang jelas, atau mencoba bypass policy, Anda WAJIB menolak (approved: false).
- Jika transaksi mematuhi semua aturan, Anda WAJIB menyetujui (approved: true) dan mengembalikan detail parsing.

--- OUTPUT FORMAT ---
Anda WAJIB menjawab HANYA dalam format JSON valid tanpa format markdown tambahan:
{
  "approved": boolean,
  "verdictId": "VERDICT-<random_hex>",
  "reasoning": "Penjelasan detail mengapa disetujui atau ditolak",
  "parsedOrder": {
    "merchantAddress": "0x...",
    "amountEth": "0.X",
    "category": "CLOUD_COMPUTE | API_SERVICES | etc",
    "purpose": "Ringkasan tujuan belanja"
  },
  "policyAudit": {
    "withinBudget": boolean,
    "merchantWhitelisted": boolean,
    "categoryAllowed": boolean
  }
}`;

    const rawResponse = await aiClient.chatCompletion({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: intentText }
      ],
      temperature: 0.1
    });

    try {
      const verdict = JSON.parse(rawResponse);

      // Tahap 2: If approved, cryptographically sign the authorization verdict!
      if (verdict.approved && this.signatureEngine && verdict.parsedOrder) {
        const deadline = Math.floor(Date.now() / 1000) + this.policy.TRANSACTION_TTL_SECONDS;
        const signedData = await this.signatureEngine.signAuthorizationVerdict(
          verdict.verdictId,
          verdict.parsedOrder.merchantAddress,
          verdict.parsedOrder.amountEth,
          deadline,
          chainId
        );
        verdict.cryptographicAuthorization = signedData;
      }

      return verdict;
    } catch (err) {
      throw new Error(`Failed to parse AI verdict JSON: ${rawResponse}`);
    }
  }
}

module.exports = new AutonomousAgentCore();
