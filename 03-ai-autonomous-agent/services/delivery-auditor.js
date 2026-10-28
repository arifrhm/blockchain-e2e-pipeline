// 03-ai-autonomous-agent/services/delivery-auditor.js
// AI Delivery Evidence Auditor: Inspects Proof-of-Fulfillment before On-Chain Escrow Release

const aiClient = require('../config/ai');

class DeliveryAuditor {
  /**
   * Evaluates proof-of-delivery or fulfillment logs before releasing funds
   */
  async auditDeliveryEvidence(orderId, orderDetails, evidencePayload) {
    console.log(`\n[AI Delivery Auditor] Auditing Proof-of-Fulfillment for Order: ${orderId}...`);

    const systemPrompt = `Anda adalah Autonomous Escrow Settlement Auditor.
Tugas Anda adalah memeriksa bukti pengiriman / log pemenuhan pesanan (proof of delivery) yang diserahkan oleh penyedia layanan/vendor.
Anda hanya boleh menyetujui pelepasan dana escrow (RELEASE_PAYMENT) jika bukti pengiriman menunjukkan status sukses, ada bukti teknis (misal: provisioning hash, uptime check, atau receipt valid), dan sesuai dengan orderDetails.

Jika bukti pengiriman palsu, kosong, error 500, atau tidak sesuai pesanan, Anda WAJIB menahan dana (HOLD_DISPUTE).

OUTPUT HANYA DALAM FORMAT JSON VALID:
{
  "delivered": boolean,
  "confidenceScore": 0-100,
  "auditVerdict": "RELEASE_PAYMENT" | "HOLD_DISPUTE",
  "auditNotes": "Penjelasan ringkas hasil audit bukti teknis"
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
