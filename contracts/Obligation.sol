// SPDX-License-Identifier: Apache-2.0

pragma solidity ^0.6.0;

import "@nomiclabs/buidler/console.sol";

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { SafeMath } from "@openzeppelin/contracts/math/SafeMath.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { European } from "./European.sol";
import { IObligation } from "./interface/IObligation.sol";
import { Bitcoin } from "./types/Bitcoin.sol";
import { ITreasury } from "./interface/ITreasury.sol";

/// @title Obligation ERC20
/// @notice Represents a writer's obligation to sell the 
/// supported collateral backing currency in return for
/// the underlying currency - in this case BTC.
/// @author Interlay
contract Obligation is IObligation, IERC20, European, Ownable {
    using SafeMath for uint;

    string constant ERR_TRANSFER_EXCEEDS_BALANCE = "Amount exceeds balance";
    string constant ERR_APPROVE_TO_ZERO_ADDRESS = "Approve to zero address";
    string constant ERR_TRANSFER_TO_ZERO_ADDRESS = "Transfer to zero address";
    string constant ERR_APPROVE_FROM_ZERO_ADDRESS = "Approve from zero address";
    string constant ERR_TRANSFER_FROM_ZERO_ADDRESS = "Transfer from zero address";

    string constant ERR_INVALID_OUTPUT_AMOUNT = "Invalid output amount";
    string constant ERR_NO_BTC_ADDRESS = "Insurer lacks BTC address";
    string constant ERR_INSUFFICIENT_OBLIGATIONS = "Seller has insufficient obligations";
    string constant ERR_INVALID_SECRET = "Buyer has encoded an incorrect secret";
    string constant ERR_SUB_WITHDRAW_BALANCE = "Insufficient pool balance";
    string constant ERR_SUB_WITHDRAW_AVAILABLE = "Insufficient available";
    string constant ERR_ZERO_STRIKE_PRICE = "Requires non-zero strike price";

    uint256 public strikePrice;

    address public override treasury;

    struct Request {
        uint secret;
        uint amount;
    }

    // accounting to track and ensure correct payouts
    mapping (address => mapping (address => Request)) internal _requests;
    mapping (address => uint) internal _locked;

    // payout addresses for obligation holders
    mapping (address => Bitcoin.Address) _payouts;

    mapping (address => uint) internal _balances;
    mapping (address => uint) internal _obligations;

    uint256 public override totalSupply;

    // model trading pools to enable withdrawals
    mapping (address => uint) internal _poolSupply;
    mapping (address => mapping (address => uint)) internal _poolBalance;

    // accounts that can spend an owners funds
    mapping (address => mapping (address => uint)) internal _allowances;

    // event Request(address indexed buyer, uint secret);

    /**
    * @notice Create Obligation ERC20
    * @param _expiryTime Unix expiry date
    * @param _windowSize Settlement window
    * @param _strikePrice Strike price
    * @param _treasury Backing currency
    **/
    constructor(
        uint256 _expiryTime,
        uint256 _windowSize,
        uint256 _strikePrice,
        address _treasury
    ) public European(_expiryTime, _windowSize) Ownable() {
        require(_strikePrice > 0, ERR_ZERO_STRIKE_PRICE);
        strikePrice = _strikePrice;
        treasury = _treasury;
    }

    function _setBtcAddress(address account, bytes20 btcHash, Bitcoin.Script format) internal {
        require(
            btcHash != 0,
            ERR_NO_BTC_ADDRESS
        );
        _payouts[account].btcHash = btcHash;
        _payouts[account].format = format;
    }

    /**
    * @notice Set the payout address for an account
    * @param btcHash: recipient address for exercising
    * @param format: recipient script format
    **/
    function setBtcAddress(bytes20 btcHash, Bitcoin.Script format) external override notExpired {
        _setBtcAddress(msg.sender, btcHash, format);
    }

    /**
    * @notice Get the configured BTC address for an account
    * @param account Minter address
    * @return btcHash Address hash
    * @return format Expected payment format
    **/
    function getBtcAddress(address account) external view override returns (bytes20 btcHash, Bitcoin.Script format) {
        return (_payouts[account].btcHash, _payouts[account].format);
    }

    /**
    * @notice Mints obligation tokens
    * @dev Can only be called by option contract before expiry
    * @param account Address to credit
    * @param amount Total credit
    * @param btcHash Bitcoin hash
    * @param format Bitcoin script format
    **/
    function mint(address account, uint256 amount, bytes20 btcHash, Bitcoin.Script format) external override notExpired onlyOwner {
        // insert into the accounts balance
        _balances[account] = _balances[account].add(amount);
        _obligations[account] = _obligations[account].add(amount);
        totalSupply = totalSupply.add(amount);

        _setBtcAddress(account, btcHash, format);

        // check treasury has enough unlocked
        ITreasury(treasury).lock(account, amount);

        emit Transfer(address(0), account, amount);
    }

    function _burn(address account, uint amount) internal {
        // we only allow the owner to withdraw
        _obligations[account] = _obligations[account].sub(amount);

        totalSupply = totalSupply.sub(amount);
        emit Transfer(account, address(0), amount);
    }

    function requestExercise(address buyer, address seller, uint amount) external override onlyOwner canExercise {
        _locked[seller] = _locked[seller].add(amount);
        require(
            _locked[seller] <= _obligations[seller],
            ERR_INSUFFICIENT_OBLIGATIONS
        );
        uint total = _requests[seller][buyer].amount;
        _requests[seller][buyer].amount = total.add(amount);

        bytes32 salt = keccak256(abi.encodePacked(
            expiryTime,
            windowSize,
            strikePrice,
            buyer,
            seller,
            total
        ));
        _requests[seller][buyer].secret = uint256(uint8(salt[0]));
    }

    function getSecret(address buyer, address seller) external view returns (uint) {
        return _requests[seller][buyer].secret;
    }

    /**
    * @notice Exercises an option after `expiryTime` but before `expiryTime + windowSize`. 
    * @dev Only callable by the parent option contract.
    * @param buyer Account that bought the options
    * @param seller Account that wrote the options
    * @param satoshiOutput Output amount
    **/
    function executeExercise(address buyer, address seller, uint satoshiOutput) external override onlyOwner canExercise {
        uint amount = _requests[seller][buyer].amount;

        // expected amount of btc
        uint satoshiAmount = _calculateExercise(amount);

        require(satoshiOutput >= satoshiAmount, ERR_INVALID_OUTPUT_AMOUNT);

        uint secret = _requests[seller][buyer].secret;
        require(
            secret == satoshiOutput.sub(satoshiAmount),
            ERR_INVALID_SECRET
        );

        _locked[seller] = _locked[seller].sub(amount);
        delete _requests[seller][buyer];

        // remove seller's obligations
        _burn(seller, amount);

        // transfers from the treasury to the buyer
        ITreasury(treasury).release(seller, buyer, amount);
    }

    /**
    * @notice Refund written collateral after `expiryTime + windowSize`.
    * @dev Only callable by the parent option contract.
    * @param seller Minter address
    * @param amount Amount of collateral
    **/
    function refund(address seller, uint amount) external override onlyOwner canRefund {
        _burn(seller, amount);

        // transfers from the treasury to the seller
        ITreasury(treasury).release(seller, seller, amount);
    }

    /**
    * @notice Withdraw collateral for obligation tokens if sold.
    * @param amount Amount of collateral
    * @param pool Address of the liquidity pool (i.e. Uniswap)
    **/
    function withdraw(uint amount, address pool) external override {
        address seller = msg.sender;

        // caller should have pool credit
        uint balance = _poolBalance[pool][seller];
        _poolBalance[pool][seller] = balance.sub(amount, ERR_SUB_WITHDRAW_BALANCE);

        // pool must have supply > balance
        uint available = _poolSupply[pool].sub(_balances[pool]);
        _poolSupply[pool] = available.sub(amount, ERR_SUB_WITHDRAW_AVAILABLE);

        // destroy obligations
        _burn(seller, amount);

        // transfers from the treasury to the seller
        ITreasury(treasury).release(seller, seller, amount);
    }

    /// @dev See {IERC20-allowance}
    function allowance(address owner, address spender) external override view returns (uint256) {
        return _allowances[owner][spender];
    }

    /// @dev See {IERC20-approve}
    function approve(address spender, uint256 amount) external override returns (bool) {
        _approve(msg.sender, spender, amount);
        return true;
    }

    function _approve(address owner, address spender, uint256 amount) internal {
        require(owner != address(0), ERR_APPROVE_FROM_ZERO_ADDRESS);
        require(spender != address(0), ERR_APPROVE_TO_ZERO_ADDRESS);

        _allowances[owner][spender] = amount;
        emit Approval(owner, spender, amount);
    }

    /// @dev See {IERC20-balanceOf}
    function balanceOf(address account) external override view returns (uint256) {
        // must show immediate balance (not written / remaining)
        // required by uniswap to mint
        return _balances[account];
    }

    function balanceObl(address account) external view returns (uint256) {
        return _obligations[account];
    }

    /// @dev See {IERC20-transfer}
    function transfer(address recipient, uint256 amount) external override notExpired returns (bool) {
        _transfer(msg.sender, recipient, amount);
        return true;
    }

    /// @dev See {IERC20-transferFrom}
    function transferFrom(address sender, address recipient, uint256 amount) external override notExpired returns (bool) {
        _transfer(sender, recipient, amount);
        _approve(sender, msg.sender, _allowances[sender][msg.sender].sub(amount, ERR_TRANSFER_EXCEEDS_BALANCE));
        return true;
    }

    /**
    * @dev Transfer the obligations from the sender to the recipient
    * @param sender The address of the sender
    * @param recipient The address of the recipient
    * @param amount The amount of tokens to transfer
    **/
    function _transfer(
        address sender,
        address recipient,
        uint256 amount
    ) internal {
        require(sender != address(0), ERR_TRANSFER_FROM_ZERO_ADDRESS);
        require(recipient != address(0), ERR_TRANSFER_TO_ZERO_ADDRESS);

        _balances[sender] = _balances[sender].sub(amount);
        _balances[recipient] = _balances[recipient].add(amount);

        if (_payouts[sender].btcHash != 0 && _payouts[recipient].btcHash != 0) {
            // simple transfer, lock recipient collateral
            // Note: the market must have 'unlocked' funds
            ITreasury(treasury).lock(recipient, amount);
            ITreasury(treasury).release(sender, sender, amount);

            // transfer ownership
            _obligations[sender] = _obligations[sender].sub(amount);
            _obligations[recipient] = _obligations[recipient].add(amount);
        } else if (_payouts[sender].btcHash != 0 && _payouts[recipient].btcHash == 0) {
            // selling obligations to a pool
            _poolSupply[recipient] = _poolSupply[recipient].add(amount);
            _poolBalance[recipient][sender] = _poolBalance[recipient][sender].add(amount);
        } else {
            // buying obligations from a pool
            require(_payouts[recipient].btcHash != 0, ERR_NO_BTC_ADDRESS);
            // call to treasury should revert if insufficient locked
            ITreasury(treasury).lock(recipient, amount);
            _obligations[recipient] = _obligations[recipient].add(amount);
        }

        emit Transfer(sender, recipient, amount);
    }

    /**
    * @dev Computes the exercise payout from the amount and the strikePrice
    * @param amount Asset to exchange
    */
    function _calculateExercise(uint256 amount) internal view returns (uint256) {
        return amount.div(strikePrice);
    }

}
