// 02-public-testnet/scripts/generate-wallet.js
// Generates a dedicated burner wallet for testnet experimentation
// Saves private key securely into .env.testnet and outputs faucet links

const fs = require('fs');
const path = require('path');
const { ethers } = require('ethers');
const networks = require('../config/networks');

const ENV_FILE = path.join(__dirname, '../.env.testnet');

function main() {
  console.log('='.repeat(80));
  console.log('🔐 GENERATING NEW TESTNET BURNER WALLET');
  console.log('='.repeat(80));

  const wallet = ethers.Wallet.createRandom();

  const envContent = [
    '# Dedicated Testnet Burner Wallet (Never store real mainnet funds here!)',
    `TESTNET_PUBLIC_ADDRESS=${wallet.address}`,
    `TESTNET_PRIVATE_KEY=${wallet.privateKey}`,
    'DEFAULT_NETWORK=base-sepolia',
    ''
  ].join('\n');

  fs.writeFileSync(ENV_FILE, envContent, { mode: 0o600 });

  console.log(`✅ New Wallet Generated Successfully!`);
  console.log(`Public Address: ${wallet.address}`);
  console.log(`Private Key:    [SAVED LOCALLY IN .env.testnet] (chmod 600)`);

  console.log('\n--- 🚰 FREE TESTNET FAUCETS (Claim Free Testnet ETH) ---');
  console.log('1. Base Sepolia Faucet (Super Fast L2):');
  networks['base-sepolia'].faucets.forEach(f => console.log(`   👉 ${f}`));

  console.log('\n2. Ethereum Sepolia Faucet (Standard L1):');
  networks['ethereum-sepolia'].faucets.forEach(f => console.log(`   👉 ${f}`));

  console.log('\n--- 💡 NEXT STEPS ---');
  console.log('1. Salin Public Address di atas.');
  console.log('2. Buka salah satu link faucet dan masukkan alamat tersebut untuk klaim 0.05 - 0.2 ETH gratis.');
  console.log('3. Jalankan pengujian di testnet:');
  console.log('   npm run test:base      (untuk Base Sepolia L2)');
  console.log('   npm run test:sepolia   (untuk Ethereum Sepolia L1)');
  console.log('='.repeat(80));
}

main();
