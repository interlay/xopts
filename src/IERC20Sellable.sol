pragma solidity ^0.5.15;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract IERC20Sellable is IERC20 {

    function getBuyable() external view returns (address);

    function totalSupplyUnsold() external view returns (uint256);

    function setBtcAddress(bytes calldata btcAddress) external;

    function getBtcAddress(address account) external view returns (bytes memory);

    /**
    * @dev Underwrite an option, can be called multiple times
    * @param amount: erc-20 collateral
    * @param btcAddress: recipient address for exercising
    **/
    function underwriteOption(address account, uint256 amount, bytes calldata btcAddress) external;

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

    function getDetails() external view returns (uint, uint, uint, uint, uint, uint);

}
