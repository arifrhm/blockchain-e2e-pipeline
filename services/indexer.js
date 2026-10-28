// services/indexer.js
// Production-grade Event Indexer & Reconciliation Service
// Listens to on-chain logs, decodes events, verifies confirmations, and updates Web2 DB

const { ethers } = require('ethers');
const db = require('./db');

class BlockchainIndexer {
  constructor(provider, contractAddress, contractAbi, requiredConfirmations = 1) {
    this.provider = provider;
    this.contractAddress = contractAddress;
    this.contract = new ethers.Contract(contractAddress, contractAbi, provider);
    this.requiredConfirmations = requiredConfirmations;
    this.lastIndexedBlock = 0;
    this.isRunning = false;
  }

  async start() {
    this.isRunning = true;
    this.lastIndexedBlock = await this.provider.getBlockNumber();
    console.log(`[Indexer] Started listening at Block #${this.lastIndexedBlock}`);

    // Subscribe to new blocks
    this.provider.on('block', async (currentBlock) => {
      await this.processBlocks(currentBlock);
    });
  }

  async sync() {
    const currentBlock = await this.provider.getBlockNumber();
    await this.processBlocks(currentBlock);
  }

  stop() {
    this.isRunning = false;
    this.provider.removeAllListeners('block');
    console.log(`[Indexer] Stopped.`);
  }

  /**
   * Polls and processes events from lastIndexedBlock up to current confirmed block
   */
  async processBlocks(currentBlockNumber) {
    const targetBlock = currentBlockNumber - this.requiredConfirmations + 1;
    if (targetBlock <= this.lastIndexedBlock) {
      return;
    }

    const fromBlock = this.lastIndexedBlock + 1;
    const toBlock = targetBlock;

    console.log(`[Indexer] Scanning blocks #${fromBlock} -> #${toBlock} (Confirmations: ${this.requiredConfirmations})...`);

    // 1. Query OrderCreated events
    const createdFilter = this.contract.filters.OrderCreated();
    const createdLogs = await this.contract.queryFilter(createdFilter, fromBlock, toBlock);

    for (const log of createdLogs) {
      await this.handleOrderCreated(log);
    }

    // 2. Query PaymentReleased events
    const releasedFilter = this.contract.filters.PaymentReleased();
    const releasedLogs = await this.contract.queryFilter(releasedFilter, fromBlock, toBlock);

    for (const log of releasedLogs) {
      await this.handlePaymentReleased(log);
    }

    this.lastIndexedBlock = toBlock;
  }

  async handleOrderCreated(log) {
    const parsed = this.contract.interface.parseLog(log);
    const orderBytes32 = parsed.args.orderId;
    const buyer = parsed.args.buyer;
    const merchant = parsed.args.merchant;
    const amount = parsed.args.amount;

    console.log(`[Indexer] ⚡ Event Caught: OrderCreated | Tx: ${log.transactionHash.slice(0, 10)}... | Block #${log.blockNumber}`);

    // Reconcile with Web2 DB: find which order matched this hash
    const allOrders = db.getAllOrders();
    const matchedOrder = allOrders.find(o => ethers.id(o.orderId) === orderBytes32);

    if (matchedOrder) {
      console.log(`[Indexer] 🔗 Reconciled On-Chain Event to Web2 Order: ${matchedOrder.orderId}`);
      db.updateOrderStatus(matchedOrder.orderId, {
        status: 'ONCHAIN_LOCKED',
        onchainBuyer: buyer,
        onchainMerchant: merchant,
        onchainAmountWei: amount.toString(),
        blockNumber: log.blockNumber,
        confirmations: this.requiredConfirmations,
        reconciledAt: new Date().toISOString()
      }, 'EVENT_RECONCILED_LOCKED');
    } else {
      console.warn(`[Indexer] Unrecognized on-chain order hash: ${orderBytes32}`);
    }
  }

  async handlePaymentReleased(log) {
    const parsed = this.contract.interface.parseLog(log);
    const orderBytes32 = parsed.args.orderId;
    const merchant = parsed.args.merchant;
    const amount = parsed.args.amount;

    console.log(`[Indexer] ⚡ Event Caught: PaymentReleased | Merchant: ${merchant.slice(0, 8)}... | Amount: ${ethers.formatEther(amount)} ETH`);

    const allOrders = db.getAllOrders();
    const matchedOrder = allOrders.find(o => ethers.id(o.orderId) === orderBytes32);

    if (matchedOrder) {
      console.log(`[Indexer] 🔗 Reconciled Settlement Event to Web2 Order: ${matchedOrder.orderId}`);
      db.updateOrderStatus(matchedOrder.orderId, {
        status: 'SETTLED',
        settledBlockNumber: log.blockNumber,
        settledAt: new Date().toISOString()
      }, 'EVENT_RECONCILED_SETTLED');
    }
  }
}

module.exports = BlockchainIndexer;
