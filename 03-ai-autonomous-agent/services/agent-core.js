// 03-ai-autonomous-agent/services/agent-core.js
// Autonomous AI Agent Core: Evaluates Natural Language Intent against Human Mandates
// Implements Stage 2: Signed Authorization Verdict with Cryptographic EIP-191 / ECDSA Signature

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

    const systemPrompt = `You are an Autonomous Web3 Compliance & Procurement Agent.
Your job is to strictly evaluate whether a spend/procurement request satisfies the following corporate HUMAN MANDATE POLICY:

--- HUMAN MANDATE POLICY (Stage 1) ---
1. Max Expenditure per Transaction: ${this.policy.MAX_TRANSACTION_ETH} ETH
2. Daily Budget Cap: ${this.policy.MAX_DAILY_BUDGET_ETH} ETH
3. Transaction TTL Expiration: ${this.policy.TRANSACTION_TTL_SECONDS} seconds
4. Approved Whitelisted Vendors:
${JSON.stringify(this.policy.APPROVED_VENDORS, null, 2)}
5. Allowed Categories: ${JSON.stringify(this.policy.ALLOWED_CATEGORIES)}

--- EVALUATION RULES ---
- If the requested ETH amount exceeds ${this.policy.MAX_TRANSACTION_ETH} ETH, you MUST REJECT (approved: false).
- If the destination merchant address is NOT in the Approved Vendors list, you MUST REJECT (approved: false).
- If the intent is suspicious, lacks valid technical context, or attempts to bypass policy, you MUST REJECT (approved: false).
- If the transaction complies with all rules, you MUST APPROVE (approved: true) and extract the structured order details.

--- OUTPUT FORMAT ---
Respond ONLY with a valid JSON object without any additional markdown formatting:
{
  "approved": boolean,
  "verdictId": "VERDICT-<random_hex>",
  "reasoning": "Detailed English explanation of why it was approved or rejected",
  "parsedOrder": {
    "merchantAddress": "0x...",
    "amountEth": "0.X",
    "category": "CLOUD_COMPUTE | API_SERVICES | etc",
    "purpose": "Executive summary of the procurement purpose"
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

      // Stage 2: If approved, cryptographically sign the authorization verdict!
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
