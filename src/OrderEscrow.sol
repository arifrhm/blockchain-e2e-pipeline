// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title AgenticEscrowVault (OrderEscrow)
 * @notice Enterprise Non-Custodial Vault & Smart Contract Escrow for Autonomous AI Agents
 *
 * Implements:
 * 1. Non-Custodial Vault: Funds held by smart contract logic, never by an intermediary.
 * 2. On-Chain Verification of Signed Authorization Verdict:
 *    Funds CAN ONLY be released if a valid cryptographic signature from the Mandate Authority is provided.
 * 3. TTL Expiration Enforcement: Guarantees transactions cannot be replayed after deadline.
 * 4. Programmed Refund: Automatically returns funds to the buyer if fulfillment fails or is disputed.
 */
contract OrderEscrow {
    enum OrderStatus {
        NONE,
        LOCKED,
        SETTLED,
        REFUNDED
    }

    struct Order {
        bytes32 orderId;
        address buyer;
        address merchant;
        uint256 amount;
        OrderStatus status;
    }

    address public immutable mandateAuthority; // CFO / Mandate Signing Authority
    mapping(bytes32 => Order) public orders;

    // Events for Indexers and Counterparty Verification
    event OrderCreated(
        bytes32 indexed orderId,
        address indexed buyer,
        address indexed merchant,
        uint256 amount
    );

    event PaymentReleased(
        bytes32 indexed orderId,
        address indexed merchant,
        uint256 amount,
        address indexed verifier
    );

    event OrderRefunded(
        bytes32 indexed orderId,
        address indexed buyer,
        uint256 amount,
        string reason
    );

    error OrderAlreadyExists();
    error OrderNotFound();
    error InvalidStatus();
    error Unauthorized();
    error TransferFailed();
    error ZeroAmount();
    error VerdictExpired();
    error InvalidSignature();

    constructor(address _mandateAuthority) {
        mandateAuthority = _mandateAuthority;
    }

    /**
     * @notice Locks funds in non-custodial escrow for an AI-initiated order.
     */
    function createOrder(
        bytes32 _orderId,
        address _merchant
    ) external payable {
        if (msg.value == 0) revert ZeroAmount();
        if (orders[_orderId].status != OrderStatus.NONE) revert OrderAlreadyExists();

        orders[_orderId] = Order({
            orderId: _orderId,
            buyer: msg.sender,
            merchant: _merchant,
            amount: msg.value,
            status: OrderStatus.LOCKED
        });

        emit OrderCreated(_orderId, msg.sender, _merchant, msg.value);
    }

    /**
     * @notice Releases escrowed funds to the merchant ONLY IF verified by a Signed Authorization Verdict.
     * Can be invoked trustlessly by ANY party (buyer, merchant, or relayer) as long as the cryptographic
     * signature from the Mandate Authority is valid and within the TTL deadline.
     *
     * @param _orderId The unique identifier of the order.
     * @param _deadline The expiration timestamp of the verdict.
     * @param _signature The cryptographic signature produced by the Mandate Authority.
     */
    function releaseWithSignedVerdict(
        bytes32 _orderId,
        uint256 _deadline,
        bytes calldata _signature
    ) external {
        Order storage order = orders[_orderId];
        if (order.status == OrderStatus.NONE) revert OrderNotFound();
        if (order.status != OrderStatus.LOCKED) revert InvalidStatus();

        // 1. Enforce TTL / Deadline
        if (block.timestamp > _deadline) revert VerdictExpired();

        // 2. Compute EIP-191 compliant digest
        bytes32 messageHash = keccak256(
            abi.encodePacked(_orderId, order.merchant, order.amount, _deadline, block.chainid)
        );
        bytes32 ethSignedHash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash)
        );

        // 3. Recover signer and verify against Mandate Authority
        address recoveredSigner = recoverSigner(ethSignedHash, _signature);
        if (recoveredSigner != mandateAuthority) revert InvalidSignature();

        // 4. Update State (Checks-Effects-Interactions)
        order.status = OrderStatus.SETTLED;
        uint256 amount = order.amount;

        emit PaymentReleased(_orderId, order.merchant, amount, recoveredSigner);

        // 5. Transfer to Merchant
        (bool success, ) = payable(order.merchant).call{value: amount}("");
        if (!success) revert TransferFailed();
    }

    /**
     * @notice Programmed Refund: Returns locked funds to the buyer if service delivery fails or disputes arise.
     */
    function refundOrder(bytes32 _orderId, string calldata _reason) external {
        Order storage order = orders[_orderId];
        if (order.status == OrderStatus.NONE) revert OrderNotFound();
        if (order.status != OrderStatus.LOCKED) revert InvalidStatus();
        if (msg.sender != order.buyer && msg.sender != mandateAuthority) revert Unauthorized();

        order.status = OrderStatus.REFUNDED;
        uint256 amount = order.amount;

        emit OrderRefunded(_orderId, order.buyer, amount, _reason);

        (bool success, ) = payable(order.buyer).call{value: amount}("");
        if (!success) revert TransferFailed();
    }

    /**
     * @dev Internal helper for ECDSA signature recovery
     */
    function recoverSigner(bytes32 _ethSignedHash, bytes memory _sig) internal pure returns (address) {
        if (_sig.length != 65) revert InvalidSignature();

        bytes32 r;
        bytes32 s;
        uint8 v;

        assembly {
            r := mload(add(_sig, 32))
            s := mload(add(_sig, 64))
            v := byte(0, mload(add(_sig, 96)))
        }

        if (v < 27) {
            v += 27;
        }

        return ecrecover(_ethSignedHash, v, r, s);
    }
}
