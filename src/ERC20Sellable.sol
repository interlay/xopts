pragma solidity ^0.5.15;

import "@nomiclabs/buidler/console.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/GSN/Context.sol";
import "@openzeppelin/contracts/ownership/Ownable.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IterableBalances} from "./IterableBalances.sol";
import {IRelay} from "./lib/IRelay.sol";
import {ITxValidator} from "./lib/ITxValidator.sol";
import {ERC20Buyable} from "./ERC20Buyable.sol";
import {Expirable} from "./Expirable.sol";
import {IERC20Buyable} from "./IERC20Buyable.sol";
import {IERC20Sellable} from "./IERC20Sellable.sol";

contract ERC20Sellable is IERC20Sellable, Context, Expirable, Ownable {
    using SafeMath for uint;
    using IterableBalances for IterableBalances.Map;

    string constant ERR_INSUFFICIENT_BALANCE = "Insufficient balance";
    string constant ERR_ZERO_PREMIUM = "Requires non-zero premium";
    string constant ERR_ZERO_STRIKE_PRICE = "Requires non-zero strike price";
    string constant ERR_NO_BTC_ADDRESS = "Insurer lacks BTC address";
    string constant ERR_VERIFY_TX = "Cannot verify tx inclusion";
    string constant ERR_VALIDATE_TX = "Cannot validate tx format";
    string constant ERR_TRANSFER_EXCEEDS_BALANCE = "ERC20: transfer amount exceeds balance";
    string constant ERR_APPROVE_TO_ZERO_ADDRESS = "ERC20: approve to the zero address";
    string constant ERR_TRANSFER_TO_ZERO_ADDRESS = "ERC20: transfer to the zero address";
    string constant ERR_APPROVE_FROM_ZERO_ADDRESS = "ERC20: approve from the zero address";
    string constant ERR_TRANSFER_FROM_ZERO_ADDRESS = "ERC20: transfer from the zero address";

    event Underwrite(address indexed minter, uint256 amount);

    // btc relay
    IRelay _relay;

    // tx validation
    ITxValidator _validator;

    // the price to buy the option
    uint256 public _premium;

    // the strike price for one satoshi
    uint256 public _strikePrice;

    // child contract
    IERC20Buyable _buyable;

    // payout addresses for underwriters
    mapping(address => bytes) _btcAddress;

    // an accounts sold + unsold balance (for refunds)
    mapping (address => uint256) private _balancesTotal;

    // the number of tokens available to buy
    IterableBalances.Map private _balancesUnsold;

    // accounts that can spend an owners funds
    mapping (address => mapping (address => uint256)) internal _allowances;

    // total number of tokens minted
    uint256 internal _totalSupply;
    uint256 internal _totalSupplyUnsold;

    constructor(
        IRelay relay,
        ITxValidator validator,
        uint256 expiry,
        uint256 premium,
        uint256 strikePrice
    ) public Expirable(expiry) Ownable() {
        require(premium > 0, ERR_ZERO_PREMIUM);
        require(strikePrice > 0, ERR_ZERO_STRIKE_PRICE);

        _relay = relay;
        _validator = validator;

        _premium = premium;
        _strikePrice = strikePrice;

        _buyable = new ERC20Buyable(expiry, strikePrice);
    }

    function totalSupply() external view returns (uint256) {
        return _totalSupply;
    }

    function totalSupplyUnsold() external view returns (uint256) {
        return _totalSupplyUnsold;
    }

    function getBuyable() external view returns (address) {
        return address(_buyable);
    }

    function underwriteOption(address account, uint256 amount, bytes calldata btcAddress) external notExpired onlyOwner {
        _mint(account, amount);
        _setBtcAddress(account, btcAddress);
        emit Underwrite(account, amount);
    }

    function _mint(address owner, uint256 amount) internal {
        // insert into the accounts balance
        _balancesTotal[owner] = _balancesTotal[owner].add(amount);
        _balancesUnsold.set(owner, _balancesUnsold.get(owner).add(amount));
        _totalSupply = _totalSupply.add(amount);
        _totalSupplyUnsold = _totalSupplyUnsold.add(amount);
        emit Transfer(address(0), owner, amount);
    }

    function _setBtcAddress(address account, bytes memory btcAddress) internal {
        require(
            btcAddress.length > 0,
            ERR_NO_BTC_ADDRESS
        );
        _btcAddress[account] = btcAddress;
    }

    /**
    * @dev Set the payout address for an account,
    * @dev facilitates trading underwrite options
    * @param btcAddress: recipient address for exercising
    **/
    function setBtcAddress(bytes calldata btcAddress) external {
        address caller = _msgSender();
        require(_balancesTotal[caller] > 0, ERR_INSUFFICIENT_BALANCE);
        _setBtcAddress(caller, btcAddress);
    }

    /**
    * @dev Get the configured BTC address for an account
    * @param account: minter address
    **/
    function getBtcAddress(address account) external view returns (bytes memory) {
        return _btcAddress[account];
    }

    function insureOption(address buyer, address seller, uint256 satoshis) external notExpired onlyOwner {
        require(_btcAddress[seller].length > 0, ERR_NO_BTC_ADDRESS);
        // require the satoshis * strike price
        uint256 options = _calculateInsure(satoshis);
        // lock token from seller
        _balancesUnsold.set(seller, _balancesUnsold.get(seller).sub(options));
        _totalSupplyUnsold = _totalSupplyUnsold.sub(options);
        _buyable.insureOption(buyer, seller, options);
    }

    function exerciseOption(
        address buyer,
        address seller,
        uint256 height,
        uint256 index,
        bytes32 txid,
        bytes calldata proof,
        bytes calldata rawtx
    ) external notExpired onlyOwner returns (uint) {
        (uint amount, uint btcAmount) = _buyable.exerciseOption(buyer, seller);
        bytes memory btcAddress = _btcAddress[seller];

        // we currently do not support multiple outputs
        // verify & validate tx, use default confirmations
        require(_relay.verifyTx(height, index, txid, proof, 0, false), ERR_VERIFY_TX);
        require(_validator.validateTx(rawtx, btcAddress, btcAmount), ERR_VALIDATE_TX);

        _balancesTotal[seller] = _balancesTotal[seller].sub(amount);
        _totalSupply = _totalSupply.sub(amount);
        return amount;
    }

    function refundOption(address account) external hasExpired onlyOwner returns (uint) {
        uint256 balance = _burn(account);
        require(balance > 0, ERR_INSUFFICIENT_BALANCE);
        return balance;
    }

    function _burn(address owner) internal returns (uint) {
        uint balance = _balancesTotal[owner];
        _balancesTotal[owner] = 0;
        _balancesUnsold.set(owner, 0);
        _totalSupply = _totalSupply.sub(balance);
        emit Transfer(owner, address(0), balance);
        return balance;
    }

    function getOptionSellers() external view returns (address[] memory sellers, uint256[] memory options) {
        IterableBalances.Map storage map = _balancesUnsold;

        uint length = map.size();
        sellers = new address[](length);
        options = new uint256[](length);

        for (uint i = 0; i < length; i++) {
            address key = map.getKeyAtIndex(i);
            uint value = map.get(key);
            sellers[i] = key;
            options[i] = value;
        }

        return (sellers, options);
    }

    function getDetails() external view returns(uint, uint, uint, uint, uint, uint) {
        return (
            _expiry,
            _premium,
            _strikePrice,
            _totalSupply,
            _buyable.totalSupply(),
            _totalSupplyUnsold
        );
    }

    function allowance(address owner, address spender) external view returns (uint256) {
        return _allowances[owner][spender];
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        _approve(_msgSender(), spender, amount);
        return true;
    }

    function _approve(address owner, address spender, uint256 amount) internal {
        require(owner != address(0), ERR_APPROVE_FROM_ZERO_ADDRESS);
        require(spender != address(0), ERR_APPROVE_TO_ZERO_ADDRESS);

        _allowances[owner][spender] = amount;
        emit Approval(owner, spender, amount);
    }

    function balanceOf(address account) external view returns (uint256) {
        return _balancesUnsold.get(account);
    }

    function totalBalanceOf(address account) external view returns (uint256) {
        return _balancesTotal[account];
    }

    function transfer(address recipient, uint256 amount) external notExpired returns (bool) {
        _transfer(_msgSender(), recipient, amount);
        return true;
    }

    function transferFrom(address sender, address recipient, uint256 amount) external notExpired returns (bool) {
        _transfer(sender, recipient, amount);
        _approve(sender, _msgSender(), _allowances[sender][_msgSender()].sub(amount, ERR_TRANSFER_EXCEEDS_BALANCE));
        return true;
    }

    /**
    * @dev Transfer the unsold options to the recipient.
    * @param sender: The address of the sender.
    * @param recipient: The address of the recipient.
    * @param amount: The amount of tokens to transfer.
    **/
    function _transfer(
        address sender,
        address recipient,
        uint256 amount
    ) internal {
        require(sender != address(0), ERR_TRANSFER_FROM_ZERO_ADDRESS);
        require(recipient != address(0), ERR_TRANSFER_TO_ZERO_ADDRESS);

        // transfer between unlocked accounts
        _balancesTotal[sender] = _balancesTotal[sender].sub(amount);
        _balancesTotal[recipient] = _balancesTotal[recipient].add(amount);

        _balancesUnsold.set(sender, _balancesUnsold.get(sender).sub(amount));
        _balancesUnsold.set(recipient, _balancesUnsold.get(recipient).add(amount));

        emit Transfer(sender, recipient, amount);
    }

    /**
    * @dev Computes the insure payout from the amount and the strikePrice
    * @param amount: asset to exchange
    */
    function _calculateInsure(uint256 amount) private view returns (uint256) {
        return amount.mul(_strikePrice);
    }

    /**
    * @dev Computes the premium per option
    * @param amount: asset to exchange
    */
    function calculatePremium(uint256 amount) external view returns (uint256) {
        return amount.mul(_premium);
    }
}