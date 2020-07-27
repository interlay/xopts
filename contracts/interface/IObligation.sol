pragma solidity ^0.5.15;

import { Bitcoin } from "../Bitcoin.sol";

interface IObligation {

    function treasury() external returns (address);

    /**
    * @notice Mints obligation tokens
    * @dev Can only be called by option contract before expiry
    * @param account Address to credit
    * @param amount Total credit
    * @param btcHash Bitcoin hash
    * @param format Bitcoin script format
    **/
    function mint(address account, uint256 amount, bytes20 btcHash, Bitcoin.Script format) external;

    /**
    * @notice Exercise an option after partial expiry
    * @dev Can only be called by option contract during window
    * @param buyer Account that bought the options
    * @param seller Account that wrote the options
    * @param total Buyer's total balance
    * @param amount Buyer's claim
    **/
    function exercise(address buyer, address seller, uint total, uint amount) external;

    /**
    * @notice Refund written collateral after full expiry
    * @param account Minter address
    * @param amount Amount of collateral
    **/
    function refund(address account, uint amount) external;

    /**
    * @notice Get the amount paid to a seller
    * @dev Caller is buyer
    * @return Amount of obligations burnt
    **/
    function getAmountPaid(address seller) external view returns (uint);

    /**
    * @notice Fetch all accounts backing options
    * @dev Useful for calculating payouts
    * @return writers Addresses
    * @return written Obligations
    **/
    function getWriters() external view returns (address[] memory writers, uint256[] memory written);

    /**
    * @notice Set the payout address for an account
    * @param btcHash: recipient address for exercising
    * @param format: recipient script format
    **/
    function setBtcAddress(bytes20 btcHash, Bitcoin.Script format) external;

    /**
    * @notice Get the configured BTC address for an account
    * @param account Minter address
    * @return btcHash Address hash
    * @return format Expected payment format
    **/
    function getBtcAddress(address account) external view returns (bytes20 btcHash, Bitcoin.Script format);

}