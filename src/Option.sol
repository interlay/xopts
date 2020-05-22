pragma solidity ^0.5.15;

import "@nomiclabs/buidler/console.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import {IRelay} from "./lib/IRelay.sol";
import {IValid} from "./lib/IValid.sol";
import "./ERC20Lockable.sol";
import "./lib/IERC137.sol";

contract PutOption is ERC20Lockable {
    using SafeMath for uint;

    // backing asset (eg. Dai or USDC)
    IERC20 _collateral;

    // btc relay
    IRelay _relay;
    IValid _valid;

    IERC137Registry _ens;

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
    string constant ERR_VERIFY_TX = "Cannot verify tx inclusion";
    string constant ERR_VALIDATE_TX = "Cannot validate tx format";

    constructor(
        IERC20 collateral,
        IRelay relay,
        IValid valid,
        IERC137Registry ens,
        uint256 expiry,
        uint256 premium,
        uint256 strikePrice
    ) public {
        require(expiry > block.number, ERR_INIT_EXPIRED);
        require(premium > 0, ERR_ZERO_PREMIUM);
        require(strikePrice > 0, ERR_ZERO_STRIKE_PRICE);

        _collateral = collateral;
        _relay = relay;
        _valid = valid;
        _ens = ens;
        _expiry = expiry;
        _premium = premium;
        _strikePrice = strikePrice;
    }

    /**
    * @dev Claim options by paying the premium
    * @param amount: erc-20 underlying
    * @param seller: insurer to use
    **/
    function insure(uint256 amount, address seller) external {
        require(!expired(), ERR_OPTION_EXPIRED);
        require(amount > 0, ERR_ZERO_AMOUNT);

        // needed for output
        address caller = msg.sender;
        require(_btcAddress[seller] != bytes20(0), ERR_NO_BTC_ADDRESS);

        // require the amount * strike price
        uint256 payout = _calculateInsure(amount);
        require(totalSupplyUnlocked() >= payout, ERR_INSUFFICIENT_UNLOCKED);

        // require the amount * premium
        uint256 premium = _calculatePremium(amount);
        require(_collateral.balanceOf(caller) >= premium, ERR_INSUFFICIENT_COLLATERAL);
        _collateral.transferFrom(caller, seller, premium);

        // lock token from seller
        _exchange(seller, caller, payout);
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
        _mintUnlocked(caller, amount);
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

    function authorsOf(address account) public view returns (bytes20[] memory authors, uint256[] memory amounts) {
        IterableMapping.Map storage map = _owned[account];
        uint length = map.size();

        authors = new bytes20[](length);
        amounts = new uint256[](length);

        for (uint i = 0; i < length; i++) {
            address key = map.getKeyAtIndex(i);
            uint value = map.get(key);

            bytes20 author = _btcAddress[key];
            require(author != bytes20(0), ERR_NO_BTC_ADDRESS);
            authors[i] = author;
            amounts[i] = _calculateExercise(value);
        }

        return (authors, amounts);
    }

    /**
    * @dev Exercise an option before expiry
    **/
    function exercise(
        uint256 height,
        uint256 index,
        bytes32 txid,
        bytes calldata proof,
        bytes calldata rawtx
    ) external {
        require(!expired(), ERR_OPTION_EXPIRED);
        address caller = msg.sender;
        require(isLocked(caller), ERR_ACCOUNT_NOT_LOCKED);
        uint256 balance = _burnAllLocked(caller);
        require(balance > 0, ERR_INSUFFICIENT_BALANCE);

        // (bytes20[] memory authors, uint256[] memory amounts) = authorsOf(caller);
        // // we currently do not support multiple outputs
        // require(authors.length > 0, ERR_VALIDATE_TX);
        // // verify & validate tx, use default confirmations
        // require(_relay.verifyTx(height, index, txid, proof, 0, false), ERR_VERIFY_TX);
        // require(_valid.validateTx(txid, rawtx, authors[0], amounts[0]), ERR_VALIDATE_TX);

        _collateral.transfer(caller, balance);
    }

    /**
    * @dev Claim collateral for tokens after expiry
    **/
    function refund() external {
        require(expired(), ERR_OPTION_NOT_EXPIRED);
        address caller = msg.sender;
        require(!isLocked(caller), ERR_ACCOUNT_LOCKED);
        uint256 balance = _burnAll(caller);
        require(balance > 0, ERR_INSUFFICIENT_BALANCE);
        _collateral.transfer(caller, balance);
    }

    // Overwrite ERC-20 functionality with expiry
    function transfer(address recipient, uint256 amount) external returns (bool) {
        require(!expired(), ERR_OPTION_EXPIRED);
        _transfer(_msgSender(), recipient, amount);
        emit Transfer(_msgSender(), recipient, amount);
        return true;
    }

    // Overwrite ERC-20 functionality with expiry
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool) {
        require(!expired(), ERR_OPTION_EXPIRED);
        _transfer(sender, recipient, amount);
        _approve(sender, _msgSender(), _allowances[sender][_msgSender()].sub(amount, ERR_TRANSFER_EXCEEDS_BALANCE));
        emit Transfer(sender, recipient, amount);
        return true;
    }

    /**
    * @dev Computes the insure payout from the amount and the strikePrice
    * @param amount: asset to exchange
    */
    function _calculateInsure(uint256 amount) private view returns (uint256) {
        return amount.mul(_strikePrice);
    }

    /**
    * @dev Computes the exerise payout from the amount and the strikePrice
    * @param amount: asset to exchange
    */
    function _calculateExercise(uint256 amount) private view returns (uint256) {
        return amount.div(_strikePrice);
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

