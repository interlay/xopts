// SPDX-License-Identifier: Apache-2.0

pragma solidity ^0.6.0;

import "@nomiclabs/buidler/console.sol";

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { Context } from "@openzeppelin/contracts/GSN/Context.sol";
import { SafeMath } from "@openzeppelin/contracts/math/SafeMath.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { IterableBalances } from "./IterableBalances.sol";
import { Expirable } from "./Expirable.sol";
import { IObligation } from "./interface/IObligation.sol";
import { Bitcoin } from "./Bitcoin.sol";
import { ITreasury } from "./interface/ITreasury.sol";

/// @title Obligation ERC20
/// @notice Represents a writer's obligation to sell the 
/// supported collateral backing currency in return for
/// the underlying currency - in this case BTC.
/// @author Interlay
contract Obligation is IObligation, IERC20, Context, Expirable, Ownable {
    using SafeMath for uint;
    using IterableBalances for IterableBalances.Map;

    string constant ERR_TRANSFER_EXCEEDS_BALANCE = "Amount exceeds balance";
    string constant ERR_APPROVE_TO_ZERO_ADDRESS = "Approve to zero address";
    string constant ERR_TRANSFER_TO_ZERO_ADDRESS = "Transfer to zero address";
    string constant ERR_APPROVE_FROM_ZERO_ADDRESS = "Approve from zero address";
    string constant ERR_TRANSFER_FROM_ZERO_ADDRESS = "Transfer from zero address";

    string constant ERR_INVALID_EXERCISE_AMOUNT = "Invalid exercise amount";
    string constant ERR_NO_BTC_ADDRESS = "Insurer lacks BTC address";

    address public override treasury;

    struct Request {
        bool exists;
        mapping (address => uint) owed;
        mapping (address => uint) paid;
    }

    // accounting to track and ensure proportional payouts
    mapping (address => Request) internal _requests;

    // payout addresses for obligation holders
    mapping (address => Bitcoin.Address) _payouts;

    // obligations writers (exc. pools)
    // read-only after expiry for payout calculation
    IterableBalances.Map internal _balancesWritten;

    // like _balancesWritten, but burnt if exercised
    // allows refunds if credited
    mapping (address => uint) internal _balancesRemaining;

    // total obligations per account (inc. pools)
    mapping (address => uint) internal _balancesAvailable;

    // required to calculate proportional purchases
    mapping (address => uint) internal _totalSupply;

    // when exercising we need a final count
    uint internal _finalSupply;

    // model trading pools to enable proportional purchases
    mapping (address => IterableBalances.Map) internal _pools;

    // accounts that can spend an owners funds
    mapping (address => mapping (address => uint)) internal _allowances;

    /**
    * @notice Create Obligation ERC20
    * @param _expiryTime Unix expiry date
    * @param _windowSize Settlement window
    * @param _treasury Backing currency
    **/
    constructor(
        uint256 _expiryTime,
        uint256 _windowSize,
        address _treasury
    ) public Expirable(_expiryTime, _windowSize) Ownable() {
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
        _setBtcAddress(_msgSender(), btcHash, format);
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
        _balancesAvailable[account] = _balancesAvailable[account].add(amount);
        _balancesRemaining[account] = _balancesRemaining[account].add(amount);
        _balancesWritten.set(account, _balancesWritten.get(account).add(amount));

        _totalSupply[address(this)] = _totalSupply[address(this)].add(amount);
        _finalSupply = _finalSupply.add(amount);

        _setBtcAddress(account, btcHash, format);

        // check treasury has enough locked
        ITreasury(treasury).lock(account, amount);

        emit Transfer(address(0), account, amount);
    }

    function _burn(address account, uint amount) internal onlyOwner {
        if (_balancesAvailable[account] == _balancesRemaining[account]) {
            // TODO: is there a better way to adjust this?
            _balancesAvailable[account] = _balancesAvailable[account].sub(amount);
        }
        // we only allow the owner to withdraw
        _balancesRemaining[account] = _balancesRemaining[account].sub(amount);

        _totalSupply[address(this)] = _totalSupply[address(this)].sub(amount);
        emit Transfer(account, address(0), amount);
    }

    /**
    * @notice Exercises an option after `expiryTime` but before `expiryTime + windowSize`. 
    * @dev Can only be called by option contract during window
    * @param buyer Account that bought the options
    * @param seller Account that wrote the options
    * @param options Buyer's total option balance
    * @param amount Buyer's claim amount
    **/
    function exercise(address buyer, address seller, uint options, uint amount) external override onlyOwner canExercise {
        if (!_requests[buyer].exists) {
            // initialize request (lock amounts)
            _requests[buyer].exists = true;
            // after expiry we do not want to alter the authorship
            // since the balances / totalSupply must be unchanged
            // for later participants
            for (uint i = 0; i < _balancesWritten.size(); i = i.add(1)) {
                address owner = _balancesWritten.getKeyAtIndex(i);
                uint256 value = _balancesWritten.get(owner);
                _requests[buyer].owed[owner] = value.mul(options).div(_finalSupply);
            }
        }

        // once locked, buyer has to payout equally
        uint owed = _requests[buyer].owed[seller];
        require(amount <= owed, ERR_INVALID_EXERCISE_AMOUNT);
        _requests[buyer].owed[seller] = owed.sub(amount);

        // track total paid to simplify payout calculation
        uint paid = _requests[buyer].paid[seller];
        _requests[buyer].paid[seller] = paid.add(amount);

        // remove seller's obligations to prevent refunds
        _burn(seller, amount);

        // transfers from the treasury to the buyer
        ITreasury(treasury).release(seller, buyer, amount);
    }

    /**
    * @notice Refund written collateral after `expiryTime + windowSize`.
    * @param seller Minter address
    * @param amount Amount of collateral
    **/
    function refund(address seller, uint amount) external override onlyOwner canRefund {
        _burn(seller, amount);

        // transfers from the treasury to the seller
        ITreasury(treasury).release(seller, seller, amount);
    }

    /**
    * @notice Get the amount paid to a seller
    * @dev Caller is buyer
    * @param seller Account to pay 
    * @return Amount of obligations burnt
    **/
    function getAmountPaid(address seller) external override view returns (uint) {
        return _requests[_msgSender()].paid[seller];
    }

    /**
    * @notice Fetch all accounts backing options
    * @dev Useful for calculating payouts
    * @return writers Addresses
    * @return written Obligations
    **/
    function getWriters() external override view returns (address[] memory writers, uint256[] memory written) {
        uint length = _balancesWritten.size();
        writers = new address[](length);
        written = new uint256[](length);

        for (uint i = 0; i < length; i++) {
            address owner = _balancesWritten.getKeyAtIndex(i);
            uint256 value = _balancesWritten.get(owner);
            writers[i] = owner;
            written[i] = value;
        }

        return (writers, written);
    }

    /// @dev See {IERC20-totalSupply}
    function totalSupply() external override view returns (uint256) {
        return _totalSupply[address(this)];
    }

    /// @dev See {IERC20-allowance}
    function allowance(address owner, address spender) external override view returns (uint256) {
        return _allowances[owner][spender];
    }

    /// @dev See {IERC20-approve}
    function approve(address spender, uint256 amount) external override returns (bool) {
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
    function balanceOf(address account) external override view returns (uint256) {
        // must show immediate balance (not written / remaining)
        // required by uniswap to mint
        return _balancesAvailable[account];
    }

    /// @dev See {IERC20-transfer}
    function transfer(address recipient, uint256 amount) external override notExpired returns (bool) {
        _transfer(_msgSender(), recipient, amount);
        return true;
    }

    /// @dev See {IERC20-transferFrom}
    function transferFrom(address sender, address recipient, uint256 amount) external override notExpired returns (bool) {
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

        _balancesAvailable[sender] = _balancesAvailable[sender].sub(amount);
        _balancesAvailable[recipient] = _balancesAvailable[recipient].add(amount);

        if (_payouts[sender].btcHash != 0 && _payouts[recipient].btcHash != 0) {
            // simple transfer, lock recipient collateral
            // Note: the market must have 'unlocked' funds
            ITreasury(treasury).lock(recipient, amount);
            ITreasury(treasury).release(sender, sender, amount);
            // transfer ownership and authorship
            _balancesRemaining[sender] = _balancesRemaining[sender].sub(amount);
            _balancesRemaining[recipient] = _balancesRemaining[recipient].add(amount);
            _balancesWritten.set(sender, _balancesWritten.get(sender).sub(amount));
            _balancesWritten.set(recipient, _balancesWritten.get(recipient).add(amount));
        } else if (_payouts[sender].btcHash != 0 && _payouts[recipient].btcHash == 0) {
            // selling obligations to a pool
            _pools[recipient].set(sender, _pools[recipient].get(sender).add(amount));
            _totalSupply[recipient] = _totalSupply[recipient].add(amount);
        } else {
            // buying obligations from a pool
            require(_payouts[recipient].btcHash != 0, ERR_NO_BTC_ADDRESS);
            // call to treasury should revert if insufficient locked
            ITreasury(treasury).lock(recipient, amount);

            // should take proportional ownership
            IterableBalances.Map storage balances = _pools[sender];
            for (uint i = 0; i < balances.size(); i = i.add(1)) {
                address owner = balances.getKeyAtIndex(i);
                uint256 value = balances.get(owner);
                uint256 take = value.mul(amount).div(_totalSupply[sender]);

                // release previously locked collateral
                ITreasury(treasury).release(owner, owner, take);
                balances.set(owner, balances.get(owner).sub(take));

                // ownership has now changed
                _balancesRemaining[owner] = _balancesRemaining[owner].sub(take);
                _balancesWritten.set(owner, _balancesWritten.get(owner).sub(amount));
            }
            _balancesRemaining[recipient] = _balancesRemaining[recipient].add(amount);
            _balancesWritten.set(recipient, _balancesWritten.get(recipient).add(amount));
            _totalSupply[sender] = _totalSupply[sender].sub(amount);
        }

        emit Transfer(sender, recipient, amount);
    }

}
