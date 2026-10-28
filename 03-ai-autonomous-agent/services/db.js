// 03-ai-autonomous-agent/services/db.js
const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, '../data/database.json');

class Database {
  constructor() {
    this.init();
  }

  init() {
    const dir = path.dirname(DB_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    if (!fs.existsSync(DB_FILE)) {
      fs.writeFileSync(DB_FILE, JSON.stringify({ orders: {}, audit_logs: [] }, null, 2));
    }
  }

  read() {
    try {
      const data = fs.readFileSync(DB_FILE, 'utf8');
      return JSON.parse(data);
    } catch (e) {
      return { orders: {}, audit_logs: [] };
    }
  }

  write(data) {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
  }

  createOrderWithAiVerdict(order, aiVerdict) {
    const data = this.read();
    data.orders[order.orderId] = {
      orderId: order.orderId,
      customerId: order.customerId,
      merchantAddress: order.merchantAddress,
      amountEth: order.amountEth,
      purpose: order.purpose,
      category: order.category,
      aiVerdict: aiVerdict,
      status: 'PENDING_BROADCAST',
      txHash: null,
      blockNumber: null,
      confirmations: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    data.audit_logs.push({
      action: 'AI_VERDICT_APPROVED',
      orderId: order.orderId,
      verdictId: aiVerdict.verdictId,
      reasoning: aiVerdict.reasoning,
      timestamp: new Date().toISOString()
    });
    this.write(data);
    return data.orders[order.orderId];
  }

  recordRejectedIntent(intentText, aiVerdict) {
    const data = this.read();
    data.audit_logs.push({
      action: 'AI_VERDICT_REJECTED',
      intent: intentText,
      verdictId: aiVerdict.verdictId,
      reasoning: aiVerdict.reasoning,
      policyAudit: aiVerdict.policyAudit,
      timestamp: new Date().toISOString()
    });
    this.write(data);
  }

  updateOrderStatus(orderId, updateFields, actionLog) {
    const data = this.read();
    if (!data.orders[orderId]) {
      throw new Error(`Order ${orderId} not found in DB`);
    }
    data.orders[orderId] = {
      ...data.orders[orderId],
      ...updateFields,
      updatedAt: new Date().toISOString()
    };
    if (actionLog) {
      data.audit_logs.push({
        action: actionLog,
        orderId,
        details: updateFields,
        timestamp: new Date().toISOString()
      });
    }
    this.write(data);
    return data.orders[orderId];
  }

  getOrder(orderId) {
    const data = this.read();
    return data.orders[orderId] || null;
  }

  getAllOrders() {
    const data = this.read();
    return Object.values(data.orders);
  }
}

module.exports = new Database();
