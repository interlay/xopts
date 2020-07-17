pragma solidity ^0.5.15;

import { Bitcoin } from "../Bitcoin.sol";

interface IObligation {

    /**
    * @dev Underwrite an option, can be called multiple times
    **/
    function mint(address account, uint256 amount, bytes20 btcHash, Bitcoin.Script format) external;

    function exercise(address account, uint amount) external;

    function refund(address account, uint amount) external;

    function getAllObligations() external view returns (address[] memory writers, uint256[] memory tokens);

    /**
    * @dev Set the payout address for an account,
    * @dev facilitates trading underwrite options
    * @param btcHash: recipient address for exercising
    * @param format: recipient script format
    **/
    function setBtcAddress(bytes20 btcHash, Bitcoin.Script format) external;

    /**
    * @dev Get the configured BTC address for an account
    * @param account: minter address
    **/
    function getBtcAddress(address account) external view returns (bytes20, Bitcoin.Script format);

}