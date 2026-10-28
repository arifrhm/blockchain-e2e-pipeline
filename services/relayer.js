// services/relayer.js
// Production-grade Transaction Relayer & Nonce Manager
// Bridges Web2 backend requests into signed, broadcasted On-Chain transactions

const { ethers } = require('ethers');
const db = require('./db');

class TransactionRelayer {
  constructor(provider, signerWallet, contractAddress, contractAbi) {
    this.provider = provider;
    this.wallet = signerWallet.connect(provider);
    this.contract = new ethers.Contract(contractAddress, contractAbi, this.wallet);
    this.nonceLock = null; // Mutex for nonce sequence
    this.currentNonce = null;
  }

  async initNonce() {
    this.currentNonce = await this.provider.getTransactionCount(this.wallet.address, 'latest');
    console.log(`[Relayer] Initialized Nonce: ${this.currentNonce} for Relayer Address: ${this.wallet.address}`);
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

  /**
   * Broadcasts createOrder() on-chain with payment
   */
  async submitCreateOrder(orderId, merchantAddress, amountEth) {
    console.log(`\n[Relayer] Processing Order ${orderId} -> On-Chain Broadcast`);
    const orderBytes32 = ethers.id(orderId);
    const valueWei = ethers.parseEther(amountEth.toString());

    const nonce = await this.getNextNonce();
    console.log(`[Relayer] Allocated Nonce: ${nonce} for Order: ${orderId}`);

    // Gas estimation with safety margin (1.2x)
    const estimatedGas = await this.contract.createOrder.estimateGas(orderBytes32, merchantAddress, {
      value: valueWei
    });
    const gasLimit = (estimatedGas * 120n) / 100n;

    const feeData = await this.provider.getFeeData();

    // Broadcast transaction
    const tx = await this.contract.createOrder(orderBytes32, merchantAddress, {
      value: valueWei,
      nonce: nonce,
      gasLimit: gasLimit,
      maxFeePerGas: feeData.maxFeePerGas || feeData.gasPrice,
      maxPriorityFeePerGas: feeData.maxPriorityFeePerGas || ethers.parseUnits('1', 'gwei')
    });

    console.log(`[Relayer] Tx Broadcasted! TxHash: ${tx.hash}`);

    // Update Web2 database state to BROADCASTED
    db.updateOrderStatus(orderId, {
      status: 'BROADCASTED',
      txHash: tx.hash,
      nonce: nonce
    }, 'TX_BROADCASTED');

    return tx;
  }

  /**
   * Broadcasts releasePayment() when Web2 delivery is confirmed
   */
  async submitReleasePayment(orderId) {
    console.log(`\n[Relayer] Triggering Payment Settlement for Order: ${orderId}`);
    const orderBytes32 = ethers.id(orderId);
    const nonce = await this.getNextNonce();

    const tx = await this.contract.releasePayment(orderBytes32, {
      nonce: nonce
    });

    console.log(`[Relayer] Settlement Tx Broadcasted! TxHash: ${tx.hash}`);

    db.updateOrderStatus(orderId, {
      settlementTxHash: tx.hash
    }, 'SETTLEMENT_BROADCASTED');

    return tx;
  }
}

module.exports = TransactionRelayer;
