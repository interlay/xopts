pragma solidity ^0.6.6;

contract MockBTCRelay {
	// verifies of a transaction is included in the Bitcoin main chain
	function verify_transaction_inclusion(
		bytes32 tx_id,
		uint256 tx_block_height,
		uint256 tx_index,
		bytes memory merkle_proof,
		uint256 confirmations
	) public returns(bool) {
		return true;
	}

	// XCLAIM: validates the transaction based on the transaction value and
	// the OP_RETURN output
	function validate_transaction(
		bytes32 tx_id,
		bytes memory raw_tx,
		uint256 payment_value,
		bytes20 recipient_btc_address,
		bytes32 op_return_id
	) public returns(bool) {
		return true;
	}

	// XFLASH: validates the timelock of the transaction
	function validate_transaction_timelock(
		bytes32 tx_id,
		bytes memory raw_tx,
		uint256 payment_value,
		uint256 timelock
	) public returns(bool) {
		return true;
	}
}
