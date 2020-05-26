pragma solidity ^0.5.15;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/GSN/Context.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IterableBalances} from "./IterableBalances.sol";
import {IRelay} from "./lib/IRelay.sol";
import {ITxValidator} from "./lib/ITxValidator.sol";
import {ERC20Buyable} from "./ERC20Buyable.sol";
import {Expirable} from "./Expirable.sol";
import {IERC20Buyable} from "./IERC20Buyable.sol";
import {IERC20Sellable} from "./IERC20Sellable.sol";

contract ERC20Sellable is IERC20Sellable, Context, Expirable {
    using SafeMath for uint;
    using IterableBalances for IterableBalances.Map;

    string constant ERR_INSUFFICIENT_BALANCE = "Insufficient balance";
    string constant ERR_ZERO_AMOUNT = "Requires non-zero amount";
    string constant ERR_UNEXPECTED_BTC_ADDRESS = "Cannot change BTC address";
    string constant ERR_TRANSFER_EXCEEDS_BALANCE = "ERC20: transfer amount exceeds balance";
    string constant ERR_APPROVE_TO_ZERO_ADDRESS = "ERC20: approve to the zero address";
    string constant ERR_TRANSFER_TO_ZERO_ADDRESS = "ERC20: transfer to the zero address";
    string constant ERR_APPROVE_FROM_ZERO_ADDRESS = "ERC20: approve from the zero address";
    string constant ERR_TRANSFER_FROM_ZERO_ADDRESS = "ERC20: transfer from the zero address";

    event Underwrite(address indexed minter, uint256 amount);

    // backing asset (eg. Dai or USDC)
    IERC20 _collateral;

    // btc relay
    IRelay _relay;

    // tx validation
    ITxValidator _valid;

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
        IERC20 collateral,
        IRelay relay,
        ITxValidator valid,
        uint256 expiry,
        uint256 premium,
        uint256 strikePrice
    ) public Expirable(expiry) {
        _collateral = collateral;
        _buyable = new ERC20Buyable(collateral, relay, valid, IERC20Sellable(this), expiry, premium, strikePrice);
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

    /**
    * @dev Underwrite an option, can be called multiple times
    * @param amount: erc-20 collateral
    * @param btcAddress: recipient address for exercising
    **/
    function underwrite(uint256 amount, bytes calldata btcAddress) external notExpired {
        require(amount > 0, ERR_ZERO_AMOUNT);

        address caller = _msgSender();
        // we do the transfer here because it requires approval
        _collateral.transferFrom(caller, address(this), amount);
        _mint(caller, amount);
        _setBtcAddress(caller, btcAddress);

        emit Underwrite(caller, amount);
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
            _btcAddress[account].length == 0 || keccak256(_btcAddress[account]) == keccak256(btcAddress),
            ERR_UNEXPECTED_BTC_ADDRESS
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

    function buyOptions(address account, uint256 amount) external notExpired returns (bool) {
        require(_msgSender() == address(_buyable), "must buy through buyer");
        _balancesUnsold.set(account, _balancesUnsold.get(account).sub(amount));
        _totalSupplyUnsold = _totalSupplyUnsold.sub(amount);
        return true;
    }

    function sellOptions(address buyer, address seller, uint256 amount) external notExpired returns (bool) {
        require(_msgSender() == address(_buyable), "must sell through buyer");
        _balancesTotal[seller] = _balancesTotal[seller].sub(amount);
        _totalSupply = _totalSupply.sub(amount);
        _collateral.transfer(buyer, amount);
        return true;
    }

    /**
    * @dev Claim collateral for tokens after expiry
    **/
    function refundOptions() external hasExpired {
        address caller = _msgSender();
        uint256 balance = _burn(caller);
        require(balance > 0, ERR_INSUFFICIENT_BALANCE);
        _collateral.transfer(caller, balance);
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
        (uint expiry, uint premium, uint strikePrice, uint totalBought) = _buyable.getDetails();
        return (
            expiry,
            premium,
            strikePrice,
            _totalSupply,
            totalBought,
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
}
