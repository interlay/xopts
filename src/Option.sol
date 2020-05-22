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

    string constant ERR_INSUFFICIENT_COLLATERAL = "Insufficient collateral";
    string constant ERR_INSUFFICIENT_UNLOCKED = "Insufficient unlocked";
    string constant ERR_INSUFFICIENT_BALANCE = "Insufficient balance";
    string constant ERR_INIT_EXPIRED = "Cannot init expired";
    string constant ERR_ZERO_PREMIUM = "Requires non-zero premium";
    string constant ERR_ZERO_STRIKE_PRICE = "Requires non-zero strike price";
    string constant ERR_ZERO_AMOUNT = "Requires non-zero amount";
    string constant ERR_OPTION_EXPIRED = "Option has expired";
    string constant ERR_OPTION_NOT_EXPIRED = "Option not expired";
    string constant ERR_NO_BTC_ADDRESS = "Insurer lacks BTC address";
    string constant ERR_UNEXPECTED_BTC_ADDRESS = "Cannot change BTC address";

    constructor(
        IERC20 collateral,
        uint256 expiry,
        uint256 premium,
        uint256 strikePrice
    ) public {
        require(expiry > block.number, ERR_INIT_EXPIRED);
        require(premium > 0, ERR_ZERO_PREMIUM);
        require(strikePrice > 0, ERR_ZERO_STRIKE_PRICE);

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
    function insure(uint256 amount, address owner) external {
        require(!expired(), ERR_OPTION_EXPIRED);
        require(amount > 0, ERR_ZERO_AMOUNT);

        // needed for output
        address caller = msg.sender;
        require(_btcAddress[owner] != bytes20(0), ERR_NO_BTC_ADDRESS);

        // require the amount * strike price
        uint256 payout = _calculatePayout(amount);
        require(totalSupplyUnlocked() >= payout, ERR_INSUFFICIENT_UNLOCKED);

        // require the amount * premium
        uint256 premium = _calculatePremium(amount);
        require(_collateral.balanceOf(caller) >= premium, ERR_INSUFFICIENT_COLLATERAL);

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
        require(!expired(), ERR_OPTION_EXPIRED);
        require(amount > 0, ERR_ZERO_AMOUNT);

        address caller = msg.sender;
        require(_collateral.balanceOf(caller) >= amount, ERR_INSUFFICIENT_BALANCE);
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
        // TODO: check balance
        address caller = msg.sender;
        require(
            _btcAddress[caller] == bytes20(0) ||
            _btcAddress[caller] == btcAddress,
            ERR_UNEXPECTED_BTC_ADDRESS
        );
        // TODO: associate with tokens?
        _btcAddress[caller] = btcAddress;
    }

    /**
    * @dev Exercise an option before expiry
    **/
    function exercise() external {
        // TODO: tx verify
        require(!expired(), ERR_OPTION_EXPIRED);
        address caller = msg.sender;
        uint256 balance = _getBalance(caller);
        require(balance > 0, ERR_INSUFFICIENT_BALANCE);
        _burn(caller, balance);
        _collateral.transfer(caller, balance);
    }

    /**
    * @dev Claim collateral for tokens after expiry
    **/
    function refund() external {
        require(expired(), ERR_OPTION_NOT_EXPIRED);
        address caller = msg.sender;
        uint256 balance = _getBalanceAuthored(caller);
        require(balance > 0, ERR_INSUFFICIENT_BALANCE);
        _setBalanceAuthored(msg.sender, 0);
        _collateral.transfer(caller, balance);
        _burnAll(caller);
    }

    // Overwrite ERC-20 functionality with expiry
    function transfer(address recipient, uint256 amount) external returns (bool) {
        require(!expired(), ERR_OPTION_EXPIRED);
        _transfer(_msgSender(), recipient, amount, false);
        emit Transfer(_msgSender(), recipient, amount);
        return true;
    }

    // Overwrite ERC-20 functionality with expiry
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool) {
        require(!expired(), ERR_OPTION_EXPIRED);
        _transfer(sender, recipient, amount, false);
        _approve(sender, _msgSender(), _allowances[sender][_msgSender()].sub(amount, ERR_TRANSFER_EXCEEDS_BALANCE));
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

