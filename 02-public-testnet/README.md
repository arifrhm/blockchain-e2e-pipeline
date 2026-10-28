# 🌐 Path 2: Public Testnet (Base Sepolia L2 & Ethereum Sepolia L1)

Folder ini berisi implementasi mandiri untuk menguji alur blockchain di **Jaringan Publik Nyata (Public Testnet)** yang dapat dilihat dan diverifikasi langsung di block explorer (Basescan & Etherscan).

---

## ⚡ Fitur Utama Path 2
* **Burner Wallet Generator:** Membuat *disposable private key* otomatis di file lokal `.env.testnet` (terlindungi oleh `.gitignore` dan permissions 0600).
* **Dual Network Support:**
  * **Base Sepolia (Layer 2):** Transaksi super cepat (~2 detik), biaya gas mikro, ideal untuk simulasi produksi.
  * **Ethereum Sepolia (Layer 1):** Standar emas industri blockchain global.
* **Faucet Balance Guard:** Jika saldo wallet 0 ETH, script akan berhenti dengan aman dan mencetak link faucet gratis beserta alamat dompet untuk disuntik saldo.
* **Live Block Explorer Proof:** Mencetak tautan transaksi langsung ke Basescan / Etherscan.

---

## 🚀 Cara Menjalankan

### Langkah 1: Buat Dompet Testnet Baru
```bash
cd /root/.gemini/antigravity-cli/scratch/blockchain-e2e-pipeline/02-public-testnet
npm run wallet:generate
```
Script akan membuat file `.env.testnet` dan menampilkan alamat dompet publik Anda.

### Langkah 2: Klaim ETH Gratis dari Faucet
Buka salah satu link faucet resmi:
* **Base Sepolia:**
  * [Coinbase Base Faucet](https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet)
  * [Superchain Faucet](https://superchainfaucet.com)
* **Ethereum Sepolia:**
  * [Google Cloud Web3 Faucet](https://cloud.google.com/application/web3/faucet/ethereum/sepolia)
  * [Sepolia Faucet](https://sepoliafaucet.com)

### Langkah 3: Jalankan Eksekusi On-Chain
* Untuk **Base Sepolia (L2):**
  ```bash
  npm run test:base
  ```
* Untuk **Ethereum Sepolia (L1):**
  ```bash
  npm run test:sepolia
  ```
Semua transaksi akan langsung tercatat dan dapat ditelusuri di internet publik!
