pragma solidity ^0.5.15;

import "@nomiclabs/buidler/console.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "./ERC20Authorable.sol";

contract PutOption is ERC20Authorable {
    using SafeMath for uint;

    // backing asset (eg. Dai or USDC)
    IERC20 _collateral;

    // expiry block of the option
    uint256 private _expiry;

    // the price to buy the option
    uint256 private _premium;

    // the strike price for 1 FlashBTC
    uint256 private _strikePrice;

    // payout addresses for underwriters
    mapping(address => bytes20) _btcAddress;

    constructor(
        IERC20 collateral,
        uint256 expiry,
        uint256 premium,
        uint256 strikePrice
    ) public {
        require(expiry > block.number, "Cannot init expired");
        require(strikePrice > 0, "Requires non-zero strikePrice");
        // check premium non-zero?

        _collateral = collateral;
        _expiry = expiry;
        _premium = premium;
        _strikePrice = strikePrice;
    }

    /**
    * @dev Claim options by paying the premium
    * @param amount: erc-20 underlying
    * @param owner: insurer to use
    **/
    function insure(uint256 amount, address owner) public {
        require(!expired(), "Option has expired");
        require(amount > 0, "Requires non-zero amount");

        // needed for output
        address caller = msg.sender;
        require(_btcAddress[owner] != bytes20(0), "Insurer lacks BTC address");

        // check that total supply is sufficient
        uint256 payout = _calculatePayout(amount);
        require(totalSupplyUnlocked() >= payout, "Insufficient unlocked");

        // require the amount * strike price
        uint256 premium = _calculatePremium(amount);
        require(_collateral.balanceOf(caller) >= premium, "Insufficient collateral");

        // take premium now and transfer options
        _collateral.transferFrom(caller, owner, premium);
        _transfer(owner, caller, payout, true);
    }

    /**
    * @dev Underwrite an option, can be called multiple times
    * @param amount: erc-20 collateral
    * @param btcAddress: recipient address for exercising
    **/
    function underwrite(uint256 amount, bytes20 btcAddress) external {
        require(!expired(), "Option has expired");
        address caller = msg.sender;
        require(_collateral.balanceOf(caller) >= amount, "Insufficient balance");
        // we do the transfer here because it requires approval
        _collateral.transferFrom(caller, address(this), amount);
        _mint(caller, caller, amount);
        setBtcAddress(btcAddress);
    }

    /**
    * @dev Set the payout address for an account,
    * @dev facilitates trading underwrite options
    * @param btcAddress: recipient address for exercising
    **/
    function setBtcAddress(bytes20 btcAddress) public {
        address caller = msg.sender;
        require(
            _btcAddress[caller] == bytes20(0) ||
            _btcAddress[caller] == btcAddress,
            "Cannot change payout address"
        );
        // TODO: associate with tokens?
        _btcAddress[caller] = btcAddress;
    }

    /**
    * @dev Exercise an option before expiry
    **/
    function exercise() public {
        // TODO: tx verify
        require(!expired(), "Option has expired");
        address caller = msg.sender;
        uint256 balance = _getBalance(caller);
        require(balance > 0, "Insufficient balance");
        _burn(caller, balance);
        _collateral.transfer(caller, balance);
    }

    /**
    * @dev Claim collateral for tokens after expiry
    **/
    function refund() public {
        require(expired(), "Option not expired");
        address caller = msg.sender;
        uint256 balance = _getBalanceAuthored(caller);
        require(balance > 0, "Insufficient balance");
        _setBalanceAuthored(msg.sender, 0);
        // TODO: cleanup expired tokens?
        _collateral.transfer(caller, balance);
    }

    // Overwrite ERC-20 functionality with expiry
    function transfer(address recipient, uint256 amount) external returns (bool) {
        require(!expired(), "Option has expired");
        _transfer(_msgSender(), recipient, amount, false);
        emit Transfer(_msgSender(), recipient, amount);
        return true;
    }

    // Overwrite ERC-20 functionality with expiry
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool) {
        require(!expired(), "Option has expired");
        _transfer(sender, recipient, amount, false);
        _approve(sender, _msgSender(), _allowances[sender][_msgSender()].sub(amount, "ERC20: transfer amount exceeds allowance"));
        emit Transfer(sender, recipient, amount);
        return true;
    }

    /**
    * @dev Computes the payout from the amount and the strikePrice
    * @param amount: asset to exchange
    */
    function _calculatePayout(uint256 amount) private view returns (uint256) {
        return amount.mul(_strikePrice);
    }

    /**
    * @dev Computes the premium per option
    * @param amount: asset to exchange
    */
    function _calculatePremium(uint256 amount) private view returns (uint256) {
        return amount.mul(_premium);
    }

    /**
    * @dev Checks if the option has expired
    */
    function expired() public view returns (bool) {
        return (block.number >= _expiry);
    }
}

