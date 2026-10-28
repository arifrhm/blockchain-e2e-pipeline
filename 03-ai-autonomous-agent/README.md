# 🤖 Path 3: Autonomous AI Agent for Blockchain Commerce

This module implements an **Autonomous AI Agent for On-Chain Commerce** connected directly to the **9Router AI Gateway** on this VPS (`http://127.0.0.1:20128/v1`) using the **`ag/gemini-3.8-flash`** model.

The architecture enforces a strict separation between **Human Mandate (Policy/Budget Guardrails)** and **Agent Execution (On-Chain Transactions)** using a non-custodial smart contract escrow.

---

## 🗺️ System Flow

```
[ Natural Language Intent ] ──► "Procure 1 unit GPU Compute 0.15 ETH to Vendor 0x90F7..."
             │
             ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                 AI AGENT CORE (services/agent-core.js)                      │
│                                                                             │
│   1. Load Policy: Max 0.3 ETH/tx, Max 0.5 ETH/day, Whitelisted Vendors      │
│   2. Query 9Router (ag/gemini-3.8-flash via /root/.config/ai/router.env)    │
│   3. Evaluate Compliance & Issue Cryptographically Signed Verdict (ECDSA)   │
└─────────────────────────────────────┬───────────────────────────────────────┘
                                      │ (If Approved)
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                 ON-CHAIN SMART CONTRACT ESCROW & RELAYER                    │
│                                                                             │
│   - Relayer broadcasts createOrder() -> 0.15 ETH locked in escrow           │
│   - OrderCreated event emitted -> Indexer marks status: ONCHAIN_LOCKED      │
└─────────────────────────────────────┬───────────────────────────────────────┘
                                      │ (After Vendor Delivers Service)
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│              AI DELIVERY EVIDENCE AUDITOR (services/delivery-auditor.js)    │
│                                                                             │
│   - AI inspects technical fulfillment proof (Uptime, IP, SHA256 receipt)   │
│   - If valid: Triggers trustless on-chain releaseWithSignedVerdict()        │
│   - If invalid/crashed: Triggers on-chain programmed refundOrder()          │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔒 Security & Zero Hardcoded Credentials
* 9Router credentials are dynamically loaded at runtime from `/root/.config/ai/router.env` (permissions `0600`) with an automatic fallback to `/root/.9router/db/data.sqlite`.
* Zero private keys or API tokens are hardcoded or printed to console logs.

---

## 🚀 How to Run

```bash
cd /root/.gemini/antigravity-cli/scratch/blockchain-e2e-pipeline/03-ai-autonomous-agent
npm test
```

---

## 🧪 3 Automated Verification Scenarios

1. **Scenario 1: Valid Enterprise Procurement (Full 4-Stage Execution)**
   * Intent: Emergency GPU cluster rental (0.15 ETH) for high RAG ingestion queue.
   * AI Mandate: **APPROVED** -> Signed Authorization Verdict issued (ECDSA signature + TTL deadline).
   * On-chain escrow locked.
   * Delivery proof verified by AI Auditor (98% confidence).
   * Atomic settlement executed on-chain via `releaseWithSignedVerdict`.
2. **Scenario 2: Fraud & Over-Budget Prevention**
   * Intent: Unauthorized transfer of 1.2 ETH to unwhitelisted wallet.
   * AI Mandate: **REJECTED** (exceeds budget, unapproved vendor).
   * Aborted immediately before touching blockchain (0 Gwei wasted).
3. **Scenario 3: Programmed Refund on Service Failure**
   * Intent: Backup GPU node rental (0.1 ETH).
   * Vendor experiences simulated outage (HTTP 500 / hardware failure).
   * AI Auditor detects SLA breach -> issues `HOLD_DISPUTE`.
   * On-chain programmed refund executed -> funds automatically returned to buyer!
