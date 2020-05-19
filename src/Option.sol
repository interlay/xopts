pragma solidity ^0.5.15;

import "@nomiclabs/buidler/console.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";

contract PutOption {
    using SafeMath for uint;

    IERC20 collateral;
    IERC20 underlying;

    address owner;
    address buyer;

    // amount of collateral locked
    uint256 public totalCollateral;

    // amount of underlying asset locked
    uint256 public totalUnderlying;

    // expiry block of the option
    uint256 public expiry;

    // the price to buy the option
    uint256 public premium;

    // the strike price for 1 FlashBTC
    uint256 public strikePrice;

    constructor(
        IERC20 _collateral,
        IERC20 _underlying,
        address _owner,
        uint256 _expiry,
        uint256 _premium,
        uint256 _strikePrice
    ) public {
        require(_expiry > block.number, "Cannot init expired");
        require(_strikePrice > 0, "Requires non-zero strikePrice");
        // check premium non-zero?

        collateral = _collateral;
        underlying = _underlying;
        owner = _owner;
        expiry = _expiry;
        premium = _premium;
        strikePrice = _strikePrice;
    }

    /**
    * @dev Claim the option for a fee
    * @param amount: erc-20 underlying
    **/
    function insure(uint256 amount) public {
        require(!_expired(), "Option has expired");
        require(!_locked(), "Option is locked");
        require(amount > 0, "Requires non-zero amount");
        // check that totalCollateral is sufficient
        _payout(amount);

        buyer = msg.sender;
        require(underlying.balanceOf(buyer) >= amount, "Insufficient underlying");
        require(collateral.balanceOf(buyer) >= premium, "Can't pay premium");
        // take premium now
        collateral.transferFrom(buyer, address(this), premium);
        totalUnderlying = totalUnderlying.add(amount);
    }

    /**
    * @dev Underwrite an option, can be called multiple times
    * @param amount: erc-20 collateral
    **/
    function underwrite(uint256 amount) public {
        require(!_expired(), "Option has expired");
        require(!_locked(), "Option is locked");
        require(msg.sender == owner, "Unauthorized");
        require(collateral.balanceOf(owner) >= amount, "Insufficient balance");
        // we do the transfer here because it requires approval
        collateral.transferFrom(owner, address(this), amount);
        totalCollateral = totalCollateral.add(amount);
    }

    /**
    * @dev Exercise an option then self-destruct
    **/
    function exercise() public {
        // TODO: tx verify
        require(!_expired(), "Option has expired");
        require(msg.sender == owner || msg.sender == buyer, "Unauthorized");

        // send locked collateral to alice
        uint payout = _payout(totalUnderlying);
        collateral.transfer(buyer, payout);

        // remainder should go to bob
        collateral.transfer(owner, totalCollateral.sub(payout));
        // premium isn't tracked in totalCollateral
        collateral.transfer(owner, premium);

        // recooperate some gas costs
        selfdestruct(address(uint160(owner)));
    }

    /**
    * @dev Computes the payout from the amount and the strikePrice
    * @param amount: asset to exchange
    */
    function _payout(uint256 amount) private view returns (uint256) {
        uint256 payout = amount.mul(strikePrice);
        require(totalCollateral >= payout, "Insufficient collateral");
        return payout;
    }

    /**
    * @dev Checks if the option has expired
    */
    function _expired() public view returns (bool) {
        return (block.number >= expiry);
    }

    /**
    * @dev Checks if the option is locked
    */
    function _locked() public view returns (bool) {
        return buyer!=address(0);
    }
}

