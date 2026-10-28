// 02-public-testnet/services/indexer.js
const { ethers } = require('ethers');
const db = require('./db');

class BlockchainIndexer {
  constructor(provider, contractAddress, contractAbi, requiredConfirmations = 2, explorerTxUrl) {
    this.provider = provider;
    this.contractAddress = contractAddress;
    this.contract = new ethers.Contract(contractAddress, contractAbi, provider);
    this.requiredConfirmations = requiredConfirmations;
    this.explorerTxUrl = explorerTxUrl;
    this.lastIndexedBlock = 0;
    this.isRunning = false;
  }

  async start() {
    this.isRunning = true;
    this.lastIndexedBlock = await this.provider.getBlockNumber();
    console.log(`[Indexer] Listening on Public Testnet starting from Block #${this.lastIndexedBlock}`);

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

  async processBlocks(currentBlockNumber) {
    const targetBlock = currentBlockNumber - this.requiredConfirmations + 1;
    if (targetBlock <= this.lastIndexedBlock) {
      return;
    }

    const fromBlock = this.lastIndexedBlock + 1;
    const toBlock = targetBlock;

    console.log(`[Indexer] Polling public blocks #${fromBlock} -> #${toBlock} (Wait ${this.requiredConfirmations} blocks for reorg safety)...`);

    try {
      const createdFilter = this.contract.filters.OrderCreated();
      const createdLogs = await this.contract.queryFilter(createdFilter, fromBlock, toBlock);

      for (const log of createdLogs) {
        await this.handleOrderCreated(log);
      }

      const releasedFilter = this.contract.filters.PaymentReleased();
      const releasedLogs = await this.contract.queryFilter(releasedFilter, fromBlock, toBlock);

      for (const log of releasedLogs) {
        await this.handlePaymentReleased(log);
      }

      this.lastIndexedBlock = toBlock;
    } catch (err) {
      console.warn(`[Indexer] Warning during log query:`, err.message);
    }
  }

  async handleOrderCreated(log) {
    const parsed = this.contract.interface.parseLog(log);
    const orderBytes32 = parsed.args.orderId;
    const buyer = parsed.args.buyer;
    const merchant = parsed.args.merchant;
    const amount = parsed.args.amount;

    console.log(`\n[Indexer] ⚡ ON-CHAIN EVENT CONFIRMED: OrderCreated`);
    console.log(`[Indexer] Block: #${log.blockNumber} | Tx: ${this.explorerTxUrl}${log.transactionHash}`);

    const allOrders = db.getAllOrders();
    const matchedOrder = allOrders.find(o => ethers.id(o.orderId) === orderBytes32);

    if (matchedOrder) {
      console.log(`[Indexer] 🔗 Reconciled to Web2 Order: ${matchedOrder.orderId}`);
      db.updateOrderStatus(matchedOrder.orderId, {
        status: 'ONCHAIN_LOCKED',
        onchainBuyer: buyer,
        onchainMerchant: merchant,
        onchainAmountWei: amount.toString(),
        blockNumber: log.blockNumber,
        confirmations: this.requiredConfirmations,
        reconciledAt: new Date().toISOString()
      }, 'EVENT_RECONCILED_LOCKED');
    }
  }

  async handlePaymentReleased(log) {
    const parsed = this.contract.interface.parseLog(log);
    const orderBytes32 = parsed.args.orderId;
    const merchant = parsed.args.merchant;
    const amount = parsed.args.amount;

    console.log(`\n[Indexer] ⚡ ON-CHAIN EVENT CONFIRMED: PaymentReleased`);
    console.log(`[Indexer] Merchant: ${merchant} | Amount: ${ethers.formatEther(amount)} ETH`);

    const allOrders = db.getAllOrders();
    const matchedOrder = allOrders.find(o => ethers.id(o.orderId) === orderBytes32);

    if (matchedOrder) {
      console.log(`[Indexer] 🔗 Reconciled Settlement to Web2 Order: ${matchedOrder.orderId}`);
      db.updateOrderStatus(matchedOrder.orderId, {
        status: 'SETTLED',
        settledBlockNumber: log.blockNumber,
        settledAt: new Date().toISOString()
      }, 'EVENT_RECONCILED_SETTLED');
    }
  }
}

module.exports = BlockchainIndexer;
