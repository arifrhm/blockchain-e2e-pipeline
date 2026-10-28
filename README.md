# 🚀 Blockchain E2E Architecture Pipeline

Repositori ini telah dipisahkan secara modular menjadi dua direktori independen agar alur pengujian lokal dan pengujian jaringan publik tidak tercampur:

---

## 📂 Struktur Direktori Terpisah

```
blockchain-e2e-pipeline/
│
├── 🏛️ 01-local-vps-node/      # PATH 1: LOCAL DEDICATED EVM NODE (ANVIL)
│   ├── src/OrderEscrow.sol    # Smart contract escrow
│   ├── services/db.js         # Web2 database mock & audit log
│   ├── services/relayer.js    # Nonce manager & gas estimator
│   ├── services/indexer.js    # Event log listener & reconciliation
│   ├── run.js                 # On-demand Anvil runner & teardown
│   ├── package.json           # npm test
│   └── README.md              # Dokumentasi lengkap Path 1
│
└── 🌐 02-public-testnet/       # PATH 2: PUBLIC TESTNET (BASE & ETH SEPOLIA)
    ├── src/OrderEscrow.sol    # Smart contract escrow
    ├── config/networks.js     # Multi-chain registry (Base & Sepolia RPCs)
    ├── scripts/generate-wallet.js # Burner Wallet Generator CLI
    ├── services/db.js         # Web2 database mock
    ├── services/relayer.js    # Dynamic gas relayer
    ├── services/indexer.js    # Public log poll indexer with reorg protection
    ├── run.js                 # Testnet runner with balance & faucet guard
    ├── .env.testnet.example   # Template config
    ├── .gitignore             # Strict ignore untuk .env.testnet
    ├── package.json           # npm run wallet:generate, npm run test:base, npm run test:sepolia
    └── README.md              # Dokumentasi lengkap Path 2
```

---

## ⚡ Perbandingan Singkat

| Parameter | 🏛️ Path 1: Local VPS Node | 🌐 Path 2: Public Testnet |
| :--- | :--- | :--- |
| **Lokasi Folder** | `01-local-vps-node/` | `02-public-testnet/` |
| **Jaringan** | Anvil DevNet Lokal (`127.0.0.1:8545`) | Base Sepolia (L2) & Ethereum Sepolia (L1) |
| **Biaya** | Rp 0 (Nol) | Rp 0 (Menggunakan Faucet Gratis) |
| **Saldo Akun** | 10.000 ETH instan per akun | Sesuai klaim faucet via Burner Wallet |
| **Kecepatan Blok** | Instan (< 50 milidetik) | 2 detik (Base) / 12 detik (Ethereum) |
| **Visibilitas** | Privat di dalam VPS | Publik di Basescan / Etherscan |
| **Fokus Pengujian** | Unit test, integrasi backend, logika smart contract | Kondisi riil, latensi jaringan internet, konfirmasi publik |
