// 02-public-testnet/services/relayer.js
const { ethers } = require('ethers');
const db = require('./db');

class TransactionRelayer {
  constructor(provider, signerWallet, contractAddress, contractAbi, explorerTxUrl) {
    this.provider = provider;
    this.wallet = signerWallet.connect(provider);
    this.contract = new ethers.Contract(contractAddress, contractAbi, this.wallet);
    this.explorerTxUrl = explorerTxUrl;
    this.currentNonce = null;
  }

  async initNonce() {
    this.currentNonce = await this.provider.getTransactionCount(this.wallet.address, 'latest');
    console.log(`[Relayer] On-Chain Nonce: ${this.currentNonce} for Address: ${this.wallet.address}`);
  }

  async getNextNonce() {
    const onchainNonce = await this.provider.getTransactionCount(this.wallet.address, 'latest');
    if (this.currentNonce === null || this.currentNonce < onchainNonce) {
      this.currentNonce = onchainNonce;
    }
    const nonce = this.currentNonce;
    this.currentNonce += 1;
    return nonce;
  }

  async submitCreateOrder(orderId, merchantAddress, amountEth) {
    console.log(`\n[Relayer] Submitting Order ${orderId} to Public Testnet...`);
    const orderBytes32 = ethers.id(orderId);
    const valueWei = ethers.parseEther(amountEth.toString());
    const nonce = await this.getNextNonce();

    const estimatedGas = await this.contract.createOrder.estimateGas(orderBytes32, merchantAddress, {
      value: valueWei
    });
    const gasLimit = (estimatedGas * 130n) / 100n; // 1.3x buffer for testnet fluctuations
    const feeData = await this.provider.getFeeData();

    const tx = await this.contract.createOrder(orderBytes32, merchantAddress, {
      value: valueWei,
      nonce: nonce,
      gasLimit: gasLimit,
      maxFeePerGas: feeData.maxFeePerGas || feeData.gasPrice,
      maxPriorityFeePerGas: feeData.maxPriorityFeePerGas || ethers.parseUnits('1.5', 'gwei')
    });

    console.log(`[Relayer] ✅ Broadcasted! TxHash: ${tx.hash}`);
    console.log(`[Relayer] 🔗 View on Explorer: ${this.explorerTxUrl}${tx.hash}`);

    db.updateOrderStatus(orderId, {
      status: 'BROADCASTED',
      txHash: tx.hash,
      nonce: nonce
    }, 'TX_BROADCASTED');

    return tx;
  }

  async submitReleasePayment(orderId) {
    console.log(`\n[Relayer] Submitting Escrow Release for Order: ${orderId}...`);
    const orderBytes32 = ethers.id(orderId);
    const nonce = await this.getNextNonce();

    const estimatedGas = await this.contract.releasePayment.estimateGas(orderBytes32);
    const gasLimit = (estimatedGas * 130n) / 100n;
    const feeData = await this.provider.getFeeData();

    const tx = await this.contract.releasePayment(orderBytes32, {
      nonce: nonce,
      gasLimit: gasLimit,
      maxFeePerGas: feeData.maxFeePerGas || feeData.gasPrice,
      maxPriorityFeePerGas: feeData.maxPriorityFeePerGas || ethers.parseUnits('1.5', 'gwei')
    });

    console.log(`[Relayer] ✅ Settlement Broadcasted! TxHash: ${tx.hash}`);
    console.log(`[Relayer] 🔗 View on Explorer: ${this.explorerTxUrl}${tx.hash}`);

    db.updateOrderStatus(orderId, {
      settlementTxHash: tx.hash
    }, 'SETTLEMENT_BROADCASTED');

    return tx;
  }
}

module.exports = TransactionRelayer;
