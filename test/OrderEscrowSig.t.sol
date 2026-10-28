// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../src/OrderEscrow.sol";

contract OrderEscrowSigTest is Test {
    OrderEscrow escrow;
    uint256 authorityPk = 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d;
    address authority = 0x70997970C51812dc3A010C7d01b50e0d17dc79C8;
    address buyer = address(0x1);
    address merchant = 0x90F79bf6EB2c4f870365E785982E1f101E93b906;

    function setUp() public {
        escrow = new OrderEscrow(authority);
        vm.deal(buyer, 10 ether);
    }

    function test_SignatureVerificationAndRelease() public {
        bytes32 orderId = keccak256("VERDICT-1234");
        uint256 amount = 0.15 ether;
        uint256 deadline = block.timestamp + 600;

        // Buyer creates order
        vm.prank(buyer);
        escrow.createOrder{value: amount}(orderId, merchant);

        // Authority signs
        bytes32 messageHash = keccak256(
            abi.encodePacked(orderId, merchant, amount, deadline, block.chainid)
        );
        bytes32 ethSignedHash = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n32", messageHash)
        );

        (uint8 v, bytes32 r, bytes32 s) = vm.sign(authorityPk, ethSignedHash);
        bytes memory sig = abi.encodePacked(r, s, v);

        // Settlement release
        uint256 merchantBalBefore = merchant.balance;
        escrow.releaseWithSignedVerdict(orderId, deadline, sig);
        assertEq(merchant.balance, merchantBalBefore + amount);
    }
}
