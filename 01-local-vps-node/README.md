# 🏛️ Path 1: Local Dedicated Anvil EVM Node di VPS

Folder ini berisi implementasi mandiri untuk pengujian **Off-Chain Backend (Web2) & Smart Contract (Web3) di dalam VPS lokal**.

---

## ⚡ Keuntungan Utama Path 1
* **Biaya:** \$0 (Nol rupiah).
* **Kecepatan:** Eksekusi super cepat (< 50 milidetik per transaksi).
* **Saldo:** 10,000 ETH instan per akun uji coba (tanpa perlu repot minta faucet).
* **Kerapian Resource:** Node Anvil dijalankan secara *on-demand* di latar belakang dan dimatikan secara otomatis begitu proses selesai (zero lingering processes).

---

## 🚀 Cara Menjalankan

Cukup masuk ke folder ini dan jalankan:

```bash
cd /root/.gemini/antigravity-cli/scratch/blockchain-e2e-pipeline/01-local-vps-node
node run.js
```
atau:
```bash
npm test
```

---

## 🔄 Apa yang Terjadi Saat Dijalankan?
1. Script mem-boot proses Anvil di port `8545`.
2. Men-deploy smart contract `OrderEscrow.sol`.
3. Memulai worker **Transaction Relayer** (manajemen antrean `nonce` & gas limit).
4. Memulai daemon **Event Indexer** (memantau log event & rekonsiliasi state ke database lokal).
5. Mensimulasikan checkout e-commerce (1.5 ETH) $\rightarrow$ locking escrow $\rightarrow$ konfirmasi delivery $\rightarrow$ settlement dana ke merchant.
6. Memvalidasi saldo merchant bertambah dan mematikan Anvil secara bersih.
