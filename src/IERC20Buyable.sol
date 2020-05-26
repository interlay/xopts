pragma solidity ^0.5.15;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract IERC20Buyable is IERC20 {

    function insure(address seller, uint256 satoshis) external;

    function exercise(
        uint256 height,
        uint256 index,
        bytes32 txid,
        bytes calldata proof,
        bytes calldata rawtx,
        address seller
    ) external;

    function getOptionOwnersFor(address account) external view returns (address[] memory sellers, uint256[] memory options);

    function getDetails() external view returns (uint, uint, uint, uint);

}
