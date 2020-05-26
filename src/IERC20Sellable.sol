pragma solidity ^0.5.15;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract IERC20Sellable is IERC20 {

    function getBuyable() external view returns (address);

    function totalSupplyUnsold() external view returns (uint256);

    function underwrite(uint256 amount, bytes calldata btcAddress) external;

    function setBtcAddress(bytes calldata btcAddress) external;

    function getBtcAddress(address account) external view returns (bytes memory);

    function buyOptions(address account, uint256 amount) external returns (bool);

    function sellOptions(address buyer, address seller, uint256 amount) external returns (bool);

    function refundOptions() external;

    function getOptionSellers() external view returns (address[] memory sellers, uint256[] memory options);

    function getDetails() external view returns (uint, uint, uint, uint, uint, uint);

}
