// 01-local-vps-node/services/relayer.js
const { ethers } = require('ethers');
const db = require('./db');

class TransactionRelayer {
  constructor(provider, signerWallet, contractAddress, contractAbi) {
    this.provider = provider;
    this.wallet = signerWallet.connect(provider);
    this.contract = new ethers.Contract(contractAddress, contractAbi, this.wallet);
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

  async submitCreateOrder(orderId, merchantAddress, amountEth) {
    console.log(`\n[Relayer] Processing Order ${orderId} -> On-Chain Broadcast`);
    const orderBytes32 = ethers.id(orderId);
    const valueWei = ethers.parseEther(amountEth.toString());
    const nonce = await this.getNextNonce();
    console.log(`[Relayer] Allocated Nonce: ${nonce} for Order: ${orderId}`);

    const estimatedGas = await this.contract.createOrder.estimateGas(orderBytes32, merchantAddress, {
      value: valueWei
    });
    const gasLimit = (estimatedGas * 120n) / 100n;
    const feeData = await this.provider.getFeeData();

    const tx = await this.contract.createOrder(orderBytes32, merchantAddress, {
      value: valueWei,
      nonce: nonce,
      gasLimit: gasLimit,
      maxFeePerGas: feeData.maxFeePerGas || feeData.gasPrice,
      maxPriorityFeePerGas: feeData.maxPriorityFeePerGas || ethers.parseUnits('1', 'gwei')
    });

    console.log(`[Relayer] Tx Broadcasted! TxHash: ${tx.hash}`);

    db.updateOrderStatus(orderId, {
      status: 'BROADCASTED',
      txHash: tx.hash,
      nonce: nonce
    }, 'TX_BROADCASTED');

    return tx;
  }

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
