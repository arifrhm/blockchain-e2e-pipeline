// 03-ai-autonomous-agent/services/delivery-auditor.js
// AI Delivery Evidence Auditor: Inspects Proof-of-Fulfillment before On-Chain Escrow Release

const aiClient = require('../config/ai');

class DeliveryAuditor {
  /**
   * Evaluates proof-of-delivery or fulfillment logs before releasing funds
   */
  async auditDeliveryEvidence(orderId, orderDetails, evidencePayload) {
    console.log(`\n[AI Delivery Auditor] Auditing Proof-of-Fulfillment for Order: ${orderId}...`);

    const systemPrompt = `You are an Autonomous Escrow Settlement Auditor.
Your task is to inspect the proof-of-delivery or technical fulfillment evidence submitted by a service vendor.
You may ONLY approve escrow release (RELEASE_PAYMENT) if the evidence demonstrates successful provisioning, valid technical telemetry (e.g. active provisioning status, uptime, healthcheck HTTP 200, valid SHA-256 receipt), and consistency with the orderDetails.

If the evidence indicates an error (e.g. HTTP 500, crash, zero uptime, empty/fake SHA256 receipt), you MUST withhold settlement (HOLD_DISPUTE).

RESPOND ONLY IN VALID JSON FORMAT WITHOUT MARKDOWN:
{
  "delivered": boolean,
  "confidenceScore": 0-100,
  "auditVerdict": "RELEASE_PAYMENT" | "HOLD_DISPUTE",
  "auditNotes": "Concise English assessment of the technical telemetry"
}`;

    const userPrompt = `ORDER DETAILS:
${JSON.stringify(orderDetails, null, 2)}

EVIDENCE SUBMITTED BY VENDOR:
${JSON.stringify(evidencePayload, null, 2)}`;

    const rawResponse = await aiClient.chatCompletion({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.1
    });

    try {
      const auditResult = JSON.parse(rawResponse);
      return auditResult;
    } catch (err) {
      throw new Error(`Failed to parse delivery audit JSON: ${rawResponse}`);
    }
  }
}

module.exports = new DeliveryAuditor();
