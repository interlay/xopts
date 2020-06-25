pragma solidity ^0.5.15;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Bitcoin} from "./lib/BitcoinTypes.sol";

contract IERC20Sellable is IERC20 {

    function getBuyable() external view returns (address);

    function totalSupplyUnsold() external view returns (uint256);

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

    /**
    * @dev Underwrite an option, can be called multiple times
    * @param amount: erc-20 collateral
    * @param btcHash: recipient address for exercising
    * @param format: recipient script format
    **/
    function underwriteOption(address account, uint256 amount, bytes20 btcHash, Bitcoin.Script format) external;

    /**
    * @dev Claim collateral for tokens after expiry
    **/
    function refundOption(address account) external returns (uint);

    function insureOption(address buyer, address seller, uint256 amount) external;

    function exerciseOption(
        address buyer,
        address seller,
        uint256 height,
        uint256 index,
        bytes32 txid,
        bytes calldata proof,
        bytes calldata rawtx
    ) external returns (uint);

    function calculatePremium(uint256 amount) external view returns (uint256);

    function getOptionSellers() external view returns (address[] memory sellers, uint256[] memory options);

    function getDetails() external view returns (
        uint expiry,
        uint premium,
        uint strikePrice,
        uint total,
        uint totalSold,
        uint totalUnsold
    );

    function totalBalanceOf(address account) external view returns (uint256);

}
