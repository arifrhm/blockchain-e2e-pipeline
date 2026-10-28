// 02-public-testnet/config/networks.js
// Multi-chain Public Testnet Registry (Base Sepolia L2 & Ethereum Sepolia L1)

module.exports = {
  'base-sepolia': {
    name: 'Base Sepolia (Layer 2)',
    chainId: 84532,
    rpcUrl: 'https://sepolia.base.org',
    explorerTxUrl: 'https://sepolia.basescan.org/tx/',
    explorerAddressUrl: 'https://sepolia.basescan.org/address/',
    blockTimeSeconds: 2,
    requiredConfirmations: 2,
    faucets: [
      'https://www.coinbase.com/faucets/base-ethereum-sepolia-faucet',
      'https://superchainfaucet.com'
    ]
  },
  'ethereum-sepolia': {
    name: 'Ethereum Sepolia (Layer 1)',
    chainId: 11155111,
    rpcUrl: 'https://ethereum-sepolia-rpc.publicnode.com',
    explorerTxUrl: 'https://sepolia.etherscan.io/tx/',
    explorerAddressUrl: 'https://sepolia.etherscan.io/address/',
    blockTimeSeconds: 12,
    requiredConfirmations: 2,
    faucets: [
      'https://cloud.google.com/application/web3/faucet/ethereum/sepolia',
      'https://sepoliafaucet.com'
    ]
  }
};
