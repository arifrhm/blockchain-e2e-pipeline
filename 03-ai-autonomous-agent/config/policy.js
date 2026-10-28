// 03-ai-autonomous-agent/config/policy.js
// Human Mandate & Policy Guardrails for Agentic Web3 Commerce

module.exports = {
  // Tahap 1: Kuota belanja maksimal (CFO Mandate)
  MAX_TRANSACTION_ETH: 0.3,

  // Tahap 1: Batas anggaran harian
  MAX_DAILY_BUDGET_ETH: 0.5,

  // Tahap 1: Batas waktu kedaluwarsa transaksi (Time-to-Live / TTL)
  TRANSACTION_TTL_SECONDS: 600, // 10 menit

  // Tahap 1: Whitelist kontrak atau penyedia API yang diizinkan
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

  // Kategori pengeluaran yang diizinkan
  ALLOWED_CATEGORIES: [
    'CLOUD_COMPUTE',
    'API_SERVICES',
    'DATASET_PROCUREMENT',
    'STORAGE_INFRASTRUCTURE'
  ]
};
