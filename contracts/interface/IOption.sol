pragma solidity ^0.5.15;

import { Bitcoin } from "../Bitcoin.sol";

interface IOption {

    function referee() external returns (address);

    function treasury() external returns (address);

    function obligation() external returns (address);

    /**
    * @notice Mints option tokens
    * @dev Can only be called by factory contract before expiry
    * @param from Origin address
    * @param to Destination address (i.e. uniswap pool)
    * @param amount Total credit
    * @param btcHash Bitcoin hash
    * @param format Bitcoin script format
    **/
    function mint(address from, address to, uint256 amount, bytes20 btcHash, Bitcoin.Script format) external;

    /**
    * @notice Exercise an option after partial expiry
    * @dev Can only be called by factory contract during window
    * @param buyer Account that bought the options
    * @param seller Account that wrote the options
    * @param amount Options to burn for collateral
    * @param height Bitcoin block height
    * @param index Bitcoin tx index
    * @param txid Bitcoin transaction id
    * @param proof Bitcoin inclusion proof
    * @param rawtx Bitcoin raw tx
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

    /**
    * @notice Refund written collateral after full expiry
    * @param account Minter address
    * @param amount Amount of collateral
    **/
    function refund(address account, uint amount) external;

}
