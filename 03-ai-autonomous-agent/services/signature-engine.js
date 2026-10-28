// 03-ai-autonomous-agent/services/signature-engine.js
// Tahap 2: Cryptographic Signed Authorization Verdict Generator (Saifuro Model)

const { ethers } = require('ethers');

class SignatureEngine {
  constructor(authorityPrivateKey) {
    this.wallet = new ethers.Wallet(authorityPrivateKey);
  }

  getAuthorityAddress() {
    return this.wallet.address;
  }

  /**
   * Signs an authorization verdict matching the OrderEscrow smart contract verification logic:
   * digest = keccak256(orderId, merchant, amount, deadline, chainId)
   */
  async signAuthorizationVerdict(orderId, merchantAddress, amountEth, deadlineTimestamp, chainId) {
    const orderBytes32 = ethers.id(orderId);
    const amountWei = ethers.parseEther(amountEth.toString());

    // Encode packed exactly as the smart contract does
    const packedMessage = ethers.solidityPacked(
      ['bytes32', 'address', 'uint256', 'uint256', 'uint256'],
      [orderBytes32, merchantAddress, amountWei, deadlineTimestamp, chainId]
    );

    const messageHash = ethers.keccak256(packedMessage);
    const messageHashBytes = ethers.getBytes(messageHash);

    // Produce standard EIP-191 personal sign
    const signature = await this.wallet.signMessage(messageHashBytes);

    return {
      orderId,
      orderBytes32,
      merchantAddress,
      amountEth,
      amountWei: amountWei.toString(),
      deadline: deadlineTimestamp,
      chainId,
      authority: this.wallet.address,
      signature
    };
  }
}

module.exports = SignatureEngine;
