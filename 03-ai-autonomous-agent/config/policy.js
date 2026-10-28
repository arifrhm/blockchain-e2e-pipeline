// 03-ai-autonomous-agent/config/policy.js
// Human Mandate & Policy Guardrails (Inspired by Saifuro Mandate Architecture)

module.exports = {
  // CFO Mandate: Maximum allowed ETH per single procurement
  MAX_TRANSACTION_ETH: 0.3,

  // CFO Mandate: Daily budget cap
  MAX_DAILY_BUDGET_ETH: 0.5,

  // Whitelist of approved enterprise merchants / vendors
  APPROVED_VENDORS: [
    {
      address: '0x90F79bf6EB2c4f870365E785982E1f101E93b906',
      name: 'Vision HyperCloud GPU Cluster (NVIDIA H100 / A100)',
      category: 'CLOUD_COMPUTE',
      slaGuarantee: '99.9% Uptime, Minimum 250 tok/s'
    },
    {
      address: '0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC',
      name: 'LlamaCloud Deep Parsing & Embedding Rails',
      category: 'API_SERVICES',
      slaGuarantee: '< 500ms p95 latency'
    }
  ],

  // Allowed expenditure categories
  ALLOWED_CATEGORIES: [
    'CLOUD_COMPUTE',
    'API_SERVICES',
    'DATASET_PROCUREMENT',
    'STORAGE_INFRASTRUCTURE'
  ]
};
