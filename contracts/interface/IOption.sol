pragma solidity ^0.5.15;

import { Bitcoin } from "../Bitcoin.sol";

interface IOption {

    function collateral() external returns (address);

    function mint(address account, uint256 amount, bytes20 btcHash, Bitcoin.Script format) external;

    /**
    * @dev Exercise options before expiry
    * @param buyer: account purchasing insurance
    * @param seller: account selling insurance
    **/
    function exercise(
        address buyer,
        address seller,
        uint256 amount,
        uint256 height,
        uint256 index,
        bytes32 txid,
        bytes calldata proof,
        bytes calldata rawtx
    ) external;
}
