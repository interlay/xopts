pragma solidity ^0.5.15;

import { Bitcoin } from "../Bitcoin.sol";

interface IOptionPairFactory {

    function createOption(
        uint256 expiry,
        uint256 window,
        uint256 strikePrice,
        address referee,
        address collateral
    ) external;

    function writeOption(address option, address from, address to, uint256 amount, bytes20 btcHash, Bitcoin.Script format) external;

    function exerciseOption(
        address option,
        address seller,
        uint256 amount,
        uint256 height,
        uint256 index,
        bytes32 txid,
        bytes calldata proof,
        bytes calldata rawtx
    ) external;

    function refundOption(address option, uint amount) external;

}
