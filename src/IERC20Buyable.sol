pragma solidity ^0.5.15;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract IERC20Buyable is IERC20 {

    /**
    * @dev Claim options by paying the premium
    * @param buyer: account purchasing insurance
    * @param seller: account selling insurance
    * @param amount: erc-20 underlying
    **/
    function insureOption(address buyer, address seller, uint256 amount) external;

    /**
    * @dev Exercise options before expiry
    * @param buyer: account purchasing insurance
    * @param seller: account selling insurance
    **/
    function exerciseOption(
        address buyer,
        address seller
    ) external returns (uint);

    function getOptionOwnersFor(address account) external view returns (address[] memory sellers, uint256[] memory options);

}
