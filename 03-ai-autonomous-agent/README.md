# 🤖 Path 3: Autonomous AI Agent for Blockchain Commerce (Saifuro Model)

Folder ini mengimplementasikan **Autonomous AI Agent for On-Chain Commerce** yang terhubung langsung ke **9Router AI Gateway** di VPS (`http://127.0.0.1:20128/v1`) menggunakan model **`ag/gemini-3.8-flash`**.

Arsitektur ini mengadopsi prinsip kerja **Saifuro**: memisahkan antara **Human Mandate (Kebijakan/Aturan)** dengan **Agent Execution (Eksekusi Transaksi)** melalui *non-custodial smart contract escrow*.

---

## 🗺️ Alur Sistem

```
[ Natural Language Intent ] ──► "Pengadaan 1 unit GPU Compute 0.2 ETH ke Vendor 0x90F7..."
             │
             ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                 AI AGENT CORE (services/agent-core.js)                      │
│                                                                             │
│   1. Load Policy: Max 1.0 ETH, Vendor Whitelist: [0x90F7...]                │
│   2. Query 9Router (ag/gemini-3.8-flash via /root/.config/ai/router.env)    │
│   3. Evaluasi Kepatuhan & Hasilkan Structured Authorization Verdict         │
└─────────────────────────────────────┬───────────────────────────────────────┘
                                      │ (Jika Disetujui)
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                 ON-CHAIN SMART CONTRACT ESCROW & RELAYER                    │
│                                                                             │
│   - Relayer membroadcast createOrder() -> Dana 0.2 ETH terkunci di escrow   │
│   - Event OrderCreated terpancar -> Indexer mencatat status ONCHAIN_LOCKED  │
└─────────────────────────────────────┬───────────────────────────────────────┘
                                      │ (Setelah Vendor Selesai Menyediakan Layanan)
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│              AI DELIVERY EVIDENCE AUDITOR (services/delivery-auditor.js)    │
│                                                                             │
│   - AI memeriksa bukti teknis pengiriman (Uptime, IP, SHA256 receipt)       │
│   - Jika valid: Memerintahkan RELEASE_PAYMENT -> Dana cair ke Merchant      │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🔒 Keamanan & Zero Hardcoded Credentials
* Kredensial 9Router dimuat secara dinamis saat runtime dari file privat `/root/.config/ai/router.env` (permissions `0600`) dengan fallback otomatis ke database internal `/root/.9router/db/data.sqlite`.
* Tidak ada API key yang pernah di-hardcode ke kode sumber atau dicetak ke log terminal.

---

## 🚀 Cara Menjalankan

Cukup masuk ke direktori dan jalankan:

```bash
cd /root/.gemini/antigravity-cli/scratch/blockchain-e2e-pipeline/03-ai-autonomous-agent
npm test
```

---

## 🧪 2 Skenario Nyata yang Diuji Secara Otomatis:

1. **Skenario 1 (Valid Enterprise Procurement):**
   * *Intent:* Pengadaan 1 unit Cloud GPU Compute 0.2 ETH ke vendor terdaftar.
   * *Respon AI:* **APPROVED** $\rightarrow$ Transaksi escrow terkunci on-chain $\rightarrow$ Bukti penyediaan server diaudit oleh AI $\rightarrow$ Pembayaran otomatis dicairkan ke merchant (+0.2 ETH).
2. **Skenario 2 (Fraud & Over-Budget Prevention):**
   * *Intent:* Transfer darurat 5.0 ETH ke dompet asing tanpa faktur.
   * *Respon AI:* **REJECTED** (melebihi batas anggaran 1.0 ETH dan vendor tidak terdaftar) $\rightarrow$ Transaksi dibatalkan sebelum menyentuh blockchain (0 gas terbuang).
