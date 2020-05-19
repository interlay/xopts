pragma solidity ^0.5.15;

import "@nomiclabs/buidler/console.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
// import "@openzeppelin/contracts/ownership/Ownable.sol";

contract PutOption {
    using SafeMath for uint;

    // uint premium; // how much does 1 option cost
    // uint total_underwritten; // the amount currently occupied

    IERC20 collateral;
    address owner;

    // expiry block of the option
    uint256 public expiry;

    // the amount supplied by underwrites
    uint256 public totalSupply;

    // the strike price for 1 FlashBTC
    uint256 public strikePrice;

    constructor(
        IERC20 _collateral,
        address _owner,
        uint256 _expiry,
        uint256 _strikePrice
    ) public {
        require(_expiry > block.number, "Cannot init expired");
        require(_strikePrice > 0, "Requires non-zero strikePrice");

        collateral = _collateral;
        owner = _owner;
        expiry = _expiry;
        strikePrice = _strikePrice;
    }

    /**
    * @dev Underwrite an option
    * @param amount: erc-20 collateral
    **/
    function underwrite(uint256 amount) public {
        require(!expired(), "Option has expired");
        require(collateral.balanceOf(owner) >= amount, "Insufficient balance");
        collateral.transferFrom(owner, address(this), amount);
        totalSupply = totalSupply.add(amount);
    }

    /**
    * @dev Exercise an option
    * @param amount: erc-20 collateral
    **/
    function exercise(uint256 amount) public {
        // TODO: tx verify
        require(!expired(), "Option has expired");
        require(amount > 0, "Requires non-zero amount");
        require(strikePrice > 0, "Requires non-zero strikePrice");

        uint payout = amount.mul(strikePrice);
        require(payout <= collateral.balanceOf(address(this)), "Not enough collateral");
        collateral.transfer(msg.sender, payout);
    }

    /**
    * @dev Checks if the option has expired
    */
    function expired() public view returns (bool) {
        return (block.number >= expiry);
    }
}

