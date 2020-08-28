// SPDX-License-Identifier: Apache-2.0

pragma solidity ^0.6.0;

import '@nomiclabs/buidler/console.sol';

import {Ownable} from '@openzeppelin/contracts/access/Ownable.sol';
import {IERC20} from '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import {SafeMath} from '@openzeppelin/contracts/math/SafeMath.sol';
import {
    ReentrancyGuard
} from '@openzeppelin/contracts/utils/ReentrancyGuard.sol';
import {ITreasury} from './interface/ITreasury.sol';
import {IEuropean} from './interface/IEuropean.sol';
import {IObligation} from './interface/IObligation.sol';
import {Bitcoin} from './types/Bitcoin.sol';
import {WriterRegistry} from './WriterRegistry.sol';

/// @title Treasury ERC20
/// @author Interlay
/// @notice This contract manages locking and unlocking of collateral.
/// @dev All operations MUST be called atomically to prevent misappropriation.
contract Treasury is ITreasury, ReentrancyGuard, Ownable, WriterRegistry {
    using SafeMath for uint256;

    string
        internal constant ERR_INSUFFICIENT_DEPOSIT = 'Insufficient deposit amount';
    string
        internal constant ERR_INSUFFICIENT_LOCKED = 'Insufficient collateral locked';
    string
        internal constant ERR_INSUFFICIENT_UNLOCKED = 'Insufficient collateral unlocked';
    string
        internal constant ERR_POSITION_INVALID_EXPIRY = 'Invalid position expiry';
    string internal constant ERR_POSITION_NOT_SET = 'Position not set';
    string internal constant ERR_POSITION_NOT_EXPIRED = 'Position not expired';
    string internal constant ERR_NOT_AUTHORIZED = 'Caller not authorized';
    string internal constant ERR_MARKET_HAS_EXPIRED = 'Market has expired';
    string internal constant ERR_MARKET_NOT_EXPIRED = 'Market not expired';
    string internal constant ERR_MARKET_EXPIRY = 'Market expiry invalid';
    string internal constant ERR_MARKET_STRIKE = 'Market strike invalid';

    /// @notice The address of the collateral ERC20
    /// @return address of the ERC20 contract
    address public override collateral;

    uint256 internal reserve;

    // market -> user -> amount
    mapping(address => mapping(address => uint256)) internal _locked;
    mapping(address => uint256) internal _unlocked;
    mapping(address => uint256) internal _balances;

    mapping(address => bool) internal _isAuthorized;

    struct Position {
        uint256 minStrike;
        uint256 maxStrike;
        uint256 expiryTime;
    }

    mapping(address => Position) internal _positions;

    /// @notice Initialize the treasury contract against an ERC20 token.
    /// @param _collateral address of the ERC20
    constructor(address _collateral, address owner) public Ownable() {
        collateral = _collateral;
        transferOwnership(owner);
    }

    /// @notice Returns the total collateral written by an `account`.
    /// @param account Address of the supplier
    function balanceOf(address account)
        external
        override
        view
        returns (uint256)
    {
        return _balances[account];
    }

    /// @notice Returns the total collateral locked in a `market` by an `account`.
    /// @param market Address of the market
    /// @param account Address of the supplier
    function lockedIn(address market, address account)
        external
        override
        view
        returns (uint256)
    {
        return _locked[market][account];
    }

    /// @notice Set the caller's position for all held collateral.
    /// @param minStrike Minimum strike price
    /// @param maxStrike Maximum strike price
    /// @param expiryTime Final expiry time
    /// @param btcHash Bitcoin address hash
    /// @param format Bitcoin address format
    function position(
        uint256 minStrike,
        uint256 maxStrike,
        uint256 expiryTime,
        bytes20 btcHash,
        Bitcoin.Script format
    ) external {
        // solium-disable-next-line security/no-block-members
        require(expiryTime >= block.timestamp, ERR_POSITION_INVALID_EXPIRY);
        require(
            expiryTime >= _positions[msg.sender].expiryTime,
            ERR_POSITION_INVALID_EXPIRY
        );

        _positions[msg.sender].minStrike = minStrike;
        _positions[msg.sender].maxStrike = maxStrike;
        _positions[msg.sender].expiryTime = expiryTime;
        _setBtcAddress(msg.sender, btcHash, format);
    }

    function authorize(address account) external override onlyOwner {
        _isAuthorized[account] = true;
    }

    /// @notice Deposit collateral in the specified `market`. Assumes
    /// collateral has been transferred within the same transaction and claims
    /// the unreserved balance since the last deposit.
    /// @dev Once 'unlocked' the caller must atomically write options or buy obligations
    /// to prevent misapproriation.
    /// @param account Address of the supplier
    function deposit(address account) external override nonReentrant {
        require(_positions[account].expiryTime > 0, ERR_POSITION_NOT_SET);
        uint256 balance = IERC20(collateral).balanceOf(address(this));
        uint256 amount = balance.sub(reserve);
        _balances[account] = _balances[account].add(amount);
        require(amount > 0, ERR_INSUFFICIENT_DEPOSIT);
        _unlocked[account] = _unlocked[account].add(amount);
        reserve = balance;
    }

    /// @notice Lock collateral for the caller, assuming sufficient
    /// funds have been deposited against the market.
    /// @dev Reverts if there is insufficient funds 'unlocked'.
    /// @param account Ethereum address that locks collateral
    /// @param amount The amount to be locked
    /// @return btcHash Bitcoin hash
    /// @return format Bitcoin script format
    function lock(address account, uint256 amount)
        external
        override
        nonReentrant
        returns (bytes20 btcHash, Bitcoin.Script format)
    {
        address market = msg.sender;
        require(_isAuthorized[market], ERR_NOT_AUTHORIZED);

        (uint256 expiry, uint256 window, uint256 strike, , , ) = IObligation(
            market
        )
            .getDetails();

        // check option expiry + window
        // cannot lapse after position
        require(
            expiry.add(window) <= _positions[account].expiryTime,
            ERR_MARKET_EXPIRY
        );
        // check strike is within range
        require(
            strike >= _positions[account].minStrike &&
                strike <= _positions[account].maxStrike,
            ERR_MARKET_STRIKE
        );

        _unlocked[account] = _unlocked[account].sub(
            amount,
            ERR_INSUFFICIENT_UNLOCKED
        );
        _locked[market][account] = _locked[market][account].add(amount);

        return _getBtcAddress(account);
    }

    function unlock(
        address market,
        address account,
        uint256 amount
    ) external override {
        require(IEuropean(market).canExit(), ERR_MARKET_NOT_EXPIRED);
        _locked[market][account] = _locked[market][account].sub(
            amount,
            ERR_INSUFFICIENT_LOCKED
        );
        _unlocked[account] = _unlocked[account].add(amount);
    }

    /// @notice Release collateral for a specific market. For instance,
    /// if an account has successfully exercised against a specific market
    /// it should call this function to release the funds.
    /// @param from Ethereum address that locked collateral
    /// @param to Ethereum address to receive collateral
    /// @param amount The amount to be unlocked
    function release(
        address from,
        address to,
        uint256 amount
    ) external override nonReentrant {
        address market = msg.sender;
        _locked[market][from] = _locked[market][from].sub(
            amount,
            ERR_INSUFFICIENT_LOCKED
        );
        _balances[from] = _balances[from].sub(amount);
        IERC20(collateral).transfer(to, amount);
        reserve = IERC20(collateral).balanceOf(address(this));
    }

    /// @notice Allows a writer to withdraw their collateral after their
    /// position has expired.
    /// @param amount The amount to be redeemed
    function withdraw(uint256 amount) external {
        address sender = msg.sender;
        require(
            block.timestamp > _positions[sender].expiryTime,
            ERR_POSITION_NOT_EXPIRED
        );
        _balances[sender] = _balances[sender].sub(amount);
        IERC20(collateral).transfer(sender, amount);
        reserve = IERC20(collateral).balanceOf(address(this));
    }
}
