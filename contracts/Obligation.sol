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
import { ITreasury } from "./interface/ITreasury.sol";

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

    address public treasury;

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
    uint256 public totalSupply;

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

    /// @dev See {IObligation-mint}
    function mint(address account, uint256 amount, bytes20 btcHash, Bitcoin.Script format) external notExpired onlyOwner {
        // insert into the accounts balance
        _balances.set(account, _balances.get(account).add(amount));
        totalSupply = totalSupply.add(amount);
        _setBtcAddress(account, btcHash, format);

        // check treasury has enough locked
        ITreasury(treasury).lock(account, amount);

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
    function setBtcAddress(bytes20 btcHash, Bitcoin.Script format) external notExpired {
        _setBtcAddress(_msgSender(), btcHash, format);
    }

    /// @dev See {IObligation-getBtcAddress}
    function getBtcAddress(address account) external view returns (bytes20 btcHash, Bitcoin.Script format) {
        return (_payouts[account].btcHash, _payouts[account].format);
    }

    function _burn(address account, uint amount) internal onlyOwner {
        _balances.set(account, _balances.get(account).sub(amount));
        totalSupply = totalSupply.sub(amount);
        emit Transfer(account, address(0), amount);
    }

    /// @dev See {IObligation-exercise}
    function exercise(address buyer, address seller, uint total, uint amount) external canExercise {
        if (!_requests[buyer].exists) {
            // initialize request (lock amounts)
            _requests[buyer].exists = true;
            for (uint i = 0; i < _balances.size(); i++) {
                address owner0 = _balances.getKeyAtIndex(i);
                uint256 value0 = _balances.get(owner0);
                if (_pools[owner0].totalSupply > 0) {
                    Pool storage pool = _pools[owner0];
                    // we may have multiple pools (e.g. in uniswap)
                    for (uint j = 0; j < pool.balances.size(); j++) {
                        address owner1 = pool.balances.getKeyAtIndex(i);
                        uint256 value1 = pool.balances.get(owner1);
                        _requests[buyer].sellers[owner1] = value1.mul(total).div(totalSupply);
                    }
                } else {
                    _requests[buyer].sellers[owner0] = value0.mul(total).div(totalSupply);
                }
            }
        }

        // once locked, buyer has to payout equally
        uint owed = _requests[buyer].sellers[seller];
        require(amount <= owed, ERR_INVALID_AMOUNT);
        _requests[buyer].sellers[seller] = owed.sub(amount);

        _burn(seller, amount);

        // transfers from the treasury to the buyer
        ITreasury(treasury).release(seller, buyer, amount);
    }

    /// @dev See {IObligation-refund}
    function refund(address account, uint amount) external canRefund {
        _burn(account, amount);

        // transfers from the treasury to the writer
        ITreasury(treasury).release(account, account, amount);
    }

    /**
    * @notice Fetch all acounts
    * @return accounts Addresses
    * @return balances Obligations
    * @return pools Address
    **/
    function getAccounts() external view returns (address[] memory accounts, uint256[] memory balances, bool[] memory pools) {
        uint length = _balances.size();
        accounts = new address[](length);
        balances = new uint256[](length);
        pools = new bool[](length);

        for (uint i = 0; i < length; i++) {
            address owner = _balances.getKeyAtIndex(i);
            uint256 value = _balances.get(owner);
            accounts[i] = owner;
            balances[i] = value;
            if (_pools[owner].totalSupply > 0) {
                pools[i] = true;
            }
        }

        return (accounts, balances, pools);
    }

    /**
    * @notice Fetch all writers and amounts in pool
    * @return writers Original writers
    * @return tokens Backed collateral
    **/
    function getPool(address account) external view returns (address[] memory accounts, uint256[] memory balances) {
        Pool storage pool = _pools[account];

        uint length = pool.balances.size();
        accounts = new address[](length);
        balances = new uint256[](length);

        for (uint i = 0; i < length; i++) {
            address owner = pool.balances.getKeyAtIndex(i);
            uint256 value = pool.balances.get(owner);
            accounts[i] = owner;
            balances[i] = value;
        }

        return (accounts, balances);
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

        if (_balances.get(sender) == 0) {
            // save gas by deleting entry
            _balances.remove(sender);
        }

        if (_payouts[sender].btcHash != 0 && _payouts[recipient].btcHash != 0) {
            // simple transfer, lock recipient collateral
            // Note: the market must have 'unlocked' funds
            ITreasury(treasury).lock(recipient, amount);
            ITreasury(treasury).unlock(sender, amount);
        } else if (_payouts[sender].btcHash != 0 && _payouts[recipient].btcHash == 0) {
            // selling obligations to a pool
            IterableBalances.Map storage pool = _pools[recipient].balances;
            pool.set(sender, pool.get(sender).add(amount));
            _pools[recipient].totalSupply = _pools[recipient].totalSupply.add(amount);
        } else {
            // buying obligations from pool
            require(_payouts[recipient].btcHash != 0, ERR_NO_BTC_ADDRESS);
            // call to treasury should revert if insufficient locked
            ITreasury(treasury).lock(recipient, amount);
            Pool storage pool = _pools[sender];
            IterableBalances.Map storage balances = pool.balances;

            // should take proportional ownership
            for (uint i = 0; i < balances.size(); i++) {
                address owner = balances.getKeyAtIndex(i);
                uint256 value = balances.get(owner);
                uint256 take = value.mul(amount).div(pool.totalSupply);

                // enables withdrawals
                ITreasury(treasury).unlock(owner, take);
                balances.set(owner, balances.get(owner).sub(take));
                // TODO: delete pool entry if zero
                pool.totalSupply = pool.totalSupply.sub(take);
            }
        }

        emit Transfer(sender, recipient, amount);
    }

}
