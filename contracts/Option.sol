// SPDX-License-Identifier: Apache-2.0

pragma solidity ^0.6.0;

import '@nomiclabs/buidler/console.sol';

import {
    IUniswapV2Pair
} from '@uniswap/v2-core/contracts/interfaces/IUniswapV2Pair.sol';
import {Ownable} from '@openzeppelin/contracts/access/Ownable.sol';
import {SafeMath} from '@openzeppelin/contracts/math/SafeMath.sol';
import {IERC20} from '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import {IOption} from './interface/IOption.sol';
import {European} from './European.sol';
import {Bitcoin} from './types/Bitcoin.sol';

/// @title Option ERC20
/// @author Interlay
/// @notice Represents options that may be exercised for the
/// backing currency in exchange for the underlying BTC.
contract Option is IOption, IERC20, European, Ownable {
    using SafeMath for uint256;

    string
        internal constant ERR_TRANSFER_EXCEEDS_BALANCE = 'Amount exceeds balance';
    string
        internal constant ERR_APPROVE_TO_ZERO_ADDRESS = 'Approve to zero address';
    string
        internal constant ERR_TRANSFER_TO_ZERO_ADDRESS = 'Transfer to zero address';
    string
        internal constant ERR_APPROVE_FROM_ZERO_ADDRESS = 'Approve from zero address';
    string
        internal constant ERR_TRANSFER_FROM_ZERO_ADDRESS = 'Transfer from zero address';

    string public name;
    string public symbol;
    uint8 public decimals;

    // account balances
    mapping(address => uint256) internal _balances;

    // accounts that can spend an owners funds
    mapping(address => mapping(address => uint256)) internal _allowances;

    // total number of options available
    uint256 public override totalSupply;

    constructor() public Ownable() {
        // solhint-disable-previous-line no-empty-blocks
    }

    /**
     * @notice Initializes the option-side contract with the
     * expected parameters.
     * @param _decimals Option precision
     * @param _expiryTime Unix expiry date
     * @param _windowSize Settlement window
     **/
    function initialize(
        uint8 _decimals,
        uint256 _expiryTime,
        uint256 _windowSize
    ) external override onlyOwner setExpiry(_expiryTime, _windowSize) {
        // ERC20
        name = 'Option';
        symbol = 'OPT';
        decimals = _decimals;
    }

    /**
     * @notice Mints an `amount` of option tokens from a `writer` to an `account`.
     * @dev Can only be called by the parent Obligation contract.
     * @dev Once the expiry date has lapsed this function is no longer valid.
     * @param writer Origin address
     * @param pair Uniswap liquidity pair
     * @param amount Total credit
     **/
    function mint(
        address writer,
        address pair,
        uint256 amount
    ) external override onlyOwner notExpired {
        // collateral:(options/obligations) are 1:1
        _balances[pair] = _balances[pair].add(amount);
        totalSupply = totalSupply.add(amount);
        emit Transfer(address(0), pair, amount);

        IUniswapV2Pair(pair).mint(writer);
    }

    function _burn(address account, uint256 amount) internal {
        _balances[account] = _balances[account].sub(
            amount,
            ERR_TRANSFER_EXCEEDS_BALANCE
        );
        totalSupply = totalSupply.sub(amount);
        emit Transfer(account, address(0), amount);
    }

    /**
     * @notice Request exercise for an amount of input satoshis then burn the equivalent
     * options to prevent spamming - these must be exercised with the specified seller.
     * @param buyer Account that bought the options.
     * @param options Input amount.
     **/
    function requestExercise(address buyer, uint256 options)
        external
        override
        onlyOwner
        canExercise
    {
        // burn options to prevent double spends
        _burn(buyer, options);
    }

    /// @dev See {IERC20-allowance}
    function allowance(address owner, address spender)
        external
        override
        view
        returns (uint256)
    {
        return _allowances[owner][spender];
    }

    /// @dev See {IERC20-approve}
    function approve(address spender, uint256 amount)
        external
        override
        notExpired
        returns (bool)
    {
        _approve(msg.sender, spender, amount);
        return true;
    }

    function _approve(
        address owner,
        address spender,
        uint256 amount
    ) internal {
        require(owner != address(0), ERR_APPROVE_FROM_ZERO_ADDRESS);
        require(spender != address(0), ERR_APPROVE_TO_ZERO_ADDRESS);

        _allowances[owner][spender] = amount;
        emit Approval(owner, spender, amount);
    }

    /// @dev See {IERC20-balanceOf}
    function balanceOf(address account)
        external
        override
        view
        returns (uint256)
    {
        return _balances[account];
    }

    /// @dev See {IERC20-transfer}
    function transfer(address recipient, uint256 amount)
        external
        override
        notExpired
        returns (bool)
    {
        _transfer(msg.sender, recipient, amount);
        return true;
    }

    /// @dev See {IERC20-transferFrom}
    function transferFrom(
        address sender,
        address recipient,
        uint256 amount
    ) external override notExpired returns (bool) {
        _transfer(sender, recipient, amount);
        _approve(
            sender,
            msg.sender,
            _allowances[sender][msg.sender].sub(
                amount,
                ERR_TRANSFER_EXCEEDS_BALANCE
            )
        );
        return true;
    }

    /**
     * @dev Transfer the options from the sender to the recipient
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

        _balances[sender] = _balances[sender].sub(
            amount,
            ERR_TRANSFER_EXCEEDS_BALANCE
        );
        _balances[recipient] = _balances[recipient].add(amount);

        emit Transfer(sender, recipient, amount);
    }
}
