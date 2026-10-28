// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title OrderEscrow
 * @notice Realistic E-Commerce / B2B Escrow contract demonstrating Web2 <-> Web3 settlement.
 * Flow:
 * 1. Web2 user checks out -> Relayer calls createOrder() with ETH payment.
 * 2. Funds locked in escrow until physical delivery confirmation.
 * 3. On delivery, releasePayment() sends funds to merchant.
 * 4. On dispute/cancellation, refundOrder() returns funds to buyer.
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

    address public immutable platformAdmin;
    mapping(bytes32 => Order) public orders;

    // Events emitted for the Web2 Indexer to listen and reconcile
    event OrderCreated(
        bytes32 indexed orderId,
        address indexed buyer,
        address indexed merchant,
        uint256 amount
    );

    event PaymentReleased(
        bytes32 indexed orderId,
        address indexed merchant,
        uint256 amount
    );

    event OrderRefunded(
        bytes32 indexed orderId,
        address indexed buyer,
        uint256 amount
    );

    error OrderAlreadyExists();
    error OrderNotFound();
    error InvalidStatus();
    error Unauthorized();
    error TransferFailed();
    error ZeroAmount();

    modifier onlyAdmin() {
        if (msg.sender != platformAdmin) revert Unauthorized();
        _;
    }

    constructor() {
        platformAdmin = msg.sender;
    }

    /**
     * @notice Locks payment in escrow for a specific Web2 order ID.
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
     * @notice Releases escrowed funds to the merchant upon delivery verification.
     * Can be invoked by the buyer or the platformAdmin relayer.
     */
    function releasePayment(bytes32 _orderId) external {
        Order storage order = orders[_orderId];
        if (order.status == OrderStatus.NONE) revert OrderNotFound();
        if (order.status != OrderStatus.LOCKED) revert InvalidStatus();
        if (msg.sender != order.buyer && msg.sender != platformAdmin) revert Unauthorized();

        order.status = OrderStatus.SETTLED;
        uint256 amount = order.amount;

        emit PaymentReleased(_orderId, order.merchant, amount);

        (bool success, ) = payable(order.merchant).call{value: amount}("");
        if (!success) revert TransferFailed();
    }

    /**
     * @notice Refunds locked payment back to buyer if order is cancelled.
     */
    function refundOrder(bytes32 _orderId) external {
        Order storage order = orders[_orderId];
        if (order.status == OrderStatus.NONE) revert OrderNotFound();
        if (order.status != OrderStatus.LOCKED) revert InvalidStatus();
        if (msg.sender != order.buyer && msg.sender != platformAdmin) revert Unauthorized();

        order.status = OrderStatus.REFUNDED;
        uint256 amount = order.amount;

        emit OrderRefunded(_orderId, order.buyer, amount);

        (bool success, ) = payable(order.buyer).call{value: amount}("");
        if (!success) revert TransferFailed();
    }
}
