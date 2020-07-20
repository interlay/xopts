pragma solidity ^0.5.15;

import "@nomiclabs/buidler/console.sol";

import { Ownable } from "@openzeppelin/contracts/ownership/Ownable.sol";
import { Context } from "@openzeppelin/contracts/GSN/Context.sol";
import { SafeMath } from "@openzeppelin/contracts/math/SafeMath.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { IterableBalances } from "./IterableBalances.sol";
import { Expirable } from "./Expirable.sol";
import { IObligation } from "./interface/IObligation.sol";
import { Bitcoin } from "./Bitcoin.sol";

/// @title Obligation-side ERC-20 tokens
/// @notice Represents written options
/// @author Interlay
contract Obligation is IObligation, IERC20, Context, Expirable, Ownable {
    using SafeMath for uint;
    using IterableBalances for IterableBalances.Map;

    string constant ERR_INSUFFICIENT_BALANCE = "Insufficient balance";
    string constant ERR_INVALID_AMOUNT = "Invalid amount";
    string constant ERR_TRANSFER_EXCEEDS_BALANCE = "Amount exceeds balance";
    string constant ERR_APPROVE_TO_ZERO_ADDRESS = "Approve to zero address";
    string constant ERR_TRANSFER_TO_ZERO_ADDRESS = "Transfer to zero address";
    string constant ERR_APPROVE_FROM_ZERO_ADDRESS = "Approve from zero address";
    string constant ERR_TRANSFER_FROM_ZERO_ADDRESS = "Transfer from zero address";
    string constant ERR_NO_BTC_ADDRESS = "Insurer lacks BTC address";

    struct Request {
        bool exists;
        mapping (address => uint) sellers;
    }

    // accounting to track and ensure proportional payouts
    mapping (address => Request) internal _requests;

    // payout addresses for underwriters
    mapping (address => Bitcoin.Address) _payouts;

    // total obligations per account
    IterableBalances.Map internal _balances;

    struct Pool {
        uint256 totalSupply;
        IterableBalances.Map balances;
    }

    // model trading pools to enable proportional purchases
    mapping (address => Pool) internal _pools;

    // accounts that can spend an owners funds
    mapping (address => mapping (address => uint)) internal _allowances;

    // total number of tokens minted
    uint256 internal _totalSupply;

    constructor(
        uint256 expiry,
        uint256 window
    ) public Expirable(expiry, window) Ownable() {}

    /// @dev See {IERC20-totalSupply}
    function totalSupply() external view returns (uint256) {
        return _totalSupply;
    }

    /// @dev See {IObligation-mint}
    function mint(address account, uint256 amount, bytes20 btcHash, Bitcoin.Script format) external notExpired onlyOwner {
        // insert into the accounts balance
        _balances.set(account, _balances.get(account).add(amount));
        _totalSupply = _totalSupply.add(amount);
        _setBtcAddress(account, btcHash, format);
        emit Transfer(address(0), account, amount);
    }

    function _setBtcAddress(address account, bytes20 btcHash, Bitcoin.Script format) internal {
        require(
            btcHash != 0,
            ERR_NO_BTC_ADDRESS
        );
        _payouts[account].btcHash = btcHash;
        _payouts[account].format = format;
    }

    /// @dev See {IObligation-setBtcAddress}
    function setBtcAddress(bytes20 btcHash, Bitcoin.Script format) external {
        address sender = _msgSender();
        require(_balances.get(sender) > 0, ERR_INSUFFICIENT_BALANCE);
        _setBtcAddress(sender, btcHash, format);
    }

    /// @dev See {IObligation-getBtcAddress}
    function getBtcAddress(address account) external view returns (bytes20 btcHash, Bitcoin.Script format) {
        return (_payouts[account].btcHash, _payouts[account].format);
    }

    function _burn(address account, uint amount) internal onlyOwner {
        _balances.set(account, _balances.get(account).sub(amount));
        _totalSupply = _totalSupply.sub(amount);
        emit Transfer(account, address(0), amount);
    }

    /// @dev See {IObligation-exercise}
    function exercise(address buyer, address seller, uint total, uint amount) external canExercise {
        if (!_requests[buyer].exists) {
            // initialize request (lock amounts)
            _requests[buyer].exists = true;
            for (uint i = 0; i < _balances.size(); i++) {
                address key = _balances.getKeyAtIndex(i);
                uint256 value = _balances.get(key);
                _requests[buyer].sellers[key] = value.mul(total).div(_totalSupply);
            }
        }

        // once locked, buyer has to payout equally
        uint owed = _requests[buyer].sellers[seller];
        require(amount <= owed, ERR_INVALID_AMOUNT);
        _requests[buyer].sellers[seller] = owed.sub(amount);

        _burn(seller, amount);
    }

    /// @dev See {IObligation-refund}
    function refund(address account, uint amount) external canRefund {
        _burn(account, amount);
    }

    /**
    * @notice Fetch all writers and amounts
    * @return writers Underwriters
    * @return tokens Backed collateral
    **/
    function getAllObligations() external view returns (address[] memory writers, uint256[] memory tokens) {
        uint length = _balances.size();
        writers = new address[](length);
        tokens = new uint256[](length);

        for (uint i = 0; i < length; i++) {
            address key = _balances.getKeyAtIndex(i);
            uint256 value = _balances.get(key);
            writers[i] = key;
            tokens[i] = value;
        }

        return (writers, tokens);
    }

    /// @dev See {IERC20-allowance}
    function allowance(address owner, address spender) external view returns (uint256) {
        return _allowances[owner][spender];
    }

    /// @dev See {IERC20-approve}
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

    /// @dev See {IERC20-balanceOf}
    function balanceOf(address account) external view returns (uint256) {
        return _balances.get(account);
    }

    /// @dev See {IERC20-transfer}
    function transfer(address recipient, uint256 amount) external notExpired returns (bool) {
        _transfer(_msgSender(), recipient, amount);
        return true;
    }

    /// @dev See {IERC20-transferFrom}
    function transferFrom(address sender, address recipient, uint256 amount) external notExpired returns (bool) {
        _transfer(sender, recipient, amount);
        _approve(sender, _msgSender(), _allowances[sender][_msgSender()].sub(amount, ERR_TRANSFER_EXCEEDS_BALANCE));
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

        _balances.set(sender, _balances.get(sender).sub(amount));
        _balances.set(recipient, _balances.get(recipient).add(amount));

        if (_payouts[sender].btcHash != 0) {
            // selling obligations to a pool
            IterableBalances.Map storage pool = _pools[recipient].balances;
            pool.set(sender, pool.get(sender).add(amount));
            _pools[recipient].totalSupply = _pools[recipient].totalSupply.add(amount);
        } else {
            require(_payouts[recipient].btcHash != 0, ERR_NO_BTC_ADDRESS);
            // TODO: check sufficient collateral

            IterableBalances.Map storage pool = _pools[sender].balances;

            // buying obligations from pool
            for (uint i = 0; i < pool.size(); i++) {
                address owner = pool.getKeyAtIndex(i);
                uint256 value = pool.get(owner);
                uint256 total = _pools[recipient].totalSupply;
                uint256 take = value.mul(amount).div(total);
                pool.set(owner, pool.get(owner).sub(take));
                _pools[recipient].totalSupply = total.sub(take);
            }
        }

        emit Transfer(sender, recipient, amount);
    }

    // /**
    // * @dev Computes the insure payout from the amount and the strikePrice
    // * @param amount: asset to exchange
    // */
    // function _calculateInsure(uint256 amount) internal view returns (uint256) {
    //     return amount.mul(_strikePrice);
    // }

}
