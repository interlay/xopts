// SPDX-License-Identifier: Apache-2.0

pragma solidity ^0.6.0;

interface IReferee {

    /**
    * @notice Verify transaction inclusion / format
    * @param height Bitcoin block height
    * @param index Bitcoin tx index
    * @param txid Bitcoin transaction id
    * @param proof Bitcoin inclusion proof
    * @param rawtx Bitcoin raw tx
    * @param btcHash Bitcoin address hash
    * @param btcAmount Bitcoin output satoshis
    **/
    function verifyTx(
        uint256 height,
        uint256 index,
        bytes32 txid,
        bytes calldata proof,
        bytes calldata rawtx,
        bytes20 btcHash,
        uint256 btcAmount
    ) external view returns(bool);

}