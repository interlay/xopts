// SPDX-License-Identifier: Apache-2.0

pragma solidity ^0.6.0;

import '@nomiclabs/buidler/console.sol';

import {
    UniswapV2Library
} from '@uniswap/v2-periphery/contracts/libraries/UniswapV2Library.sol';
import {Ownable} from '@openzeppelin/contracts/access/Ownable.sol';
import {SafeMath} from '@openzeppelin/contracts/math/SafeMath.sol';
import {IERC20} from '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import {European} from './European.sol';
import {IOption} from './interface/IOption.sol';
import {IObligation} from './interface/IObligation.sol';
import {Bitcoin} from './types/Bitcoin.sol';
import {ITreasury} from './interface/ITreasury.sol';
import {WriterRegistry} from './WriterRegistry.sol';
import {IReferee} from './interface/IReferee.sol';

/// @title Obligation ERC20
/// @notice Represents a writer's obligation to sell the
/// supported collateral backing currency in return for
/// the underlying currency - in this case BTC.
/// @author Interlay
contract Obligation is IObligation, IERC20, European, Ownable, WriterRegistry {
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

    string
        internal constant ERR_INVALID_OUTPUT_AMOUNT = 'Invalid output amount';
    string internal constant ERR_NO_BTC_ADDRESS = 'Account lacks BTC address';
    string
        internal constant ERR_INSUFFICIENT_OBLIGATIONS = 'Seller has insufficient obligations';
    string
        internal constant ERR_INVALID_REQUEST = 'Cannot exercise without an amount';
    string
        internal constant ERR_SUB_WITHDRAW_BALANCE = 'Insufficient pool balance';
    string
        internal constant ERR_SUB_WITHDRAW_AVAILABLE = 'Insufficient available';
    string
        internal constant ERR_ZERO_STRIKE_PRICE = 'Requires non-zero strike price';

    // 1 BTC = 10**10 Satoshis
    uint256 internal constant SATOSHI_DECIMALS = 10;

    string public name;
    string public symbol;
    uint8 public decimals;

    // set price at which options can be sold when exercised
    uint256 public strikePrice;

    address public override option;

    // btc relay or oracle
    address public override referee;

    address public override treasury;

    address public uniswap;

    uint256 internal _nonce;

    struct Request {
        uint256 amount;
        address buyer;
        address seller;
    }

    // accounting to track and ensure correct payouts
    mapping(bytes32 => Request) internal _requests;
    mapping(address => uint256) internal _locked;

    mapping(address => uint256) internal _balances;
    mapping(address => uint256) internal _obligations;

    uint256 public override totalSupply;

    // model trading pools to enable withdrawals
    mapping(address => uint256) internal _poolSupply;
    mapping(address => mapping(address => uint256)) internal _poolBalance;

    // accounts that can spend an owners funds
    mapping(address => mapping(address => uint256)) internal _allowances;

    /// @notice Emit upon successful exercise request.
    event RequestExercise(
        address indexed buyer,
        address indexed seller,
        bytes32 id,
        uint256 amount
    );

    /// @notice Emit upon successful exercise execution (tx inclusion & verification).
    event ExecuteExercise(
        address indexed buyer,
        address indexed seller,
        uint256 amount
    );

    /// @notice Emit once collateral is reclaimed by a writer after `expiryTime + windowSize`.
    event Refund(address indexed seller, uint256 amount);

    /// @notice Emit once collateral is reclaimed by an obligation seller.
    event Withdraw(address indexed seller, address pool, uint256 amount);

    constructor() public Ownable() {
        // solhint-disable-previous-line no-empty-blocks
    }

    /**
     * @notice Create Obligation ERC20
     * @param _expiryTime Unix expiry date
     * @param _windowSize Settlement window
     * @param _strikePrice Strike price
     * @param _referee Inclusion verifier
     * @param _option ERC20 option
     * @param _treasury Backing currency
     **/
    function initialize(
        uint8 _decimals,
        uint256 _expiryTime,
        uint256 _windowSize,
        uint256 _strikePrice,
        address _option,
        address _referee,
        address _treasury,
        address _uniswap
    ) external override onlyOwner setExpiry(_expiryTime, _windowSize) {
        require(_strikePrice > 0, ERR_ZERO_STRIKE_PRICE);

        // ERC20
        name = 'Obligation';
        symbol = 'OBL';
        decimals = _decimals;

        // Obligation
        strikePrice = _strikePrice;
        option = _option;
        referee = _referee;
        treasury = _treasury;
        uniswap = _uniswap;
    }

    function getDetails()
        external
        override
        view
        returns (
            uint256 _expiryTime,
            uint256 _windowSize,
            uint256 _strikePrice,
            uint256 _decimals,
            address _collateral,
            address _option
        )
    {
        address collateral = ITreasury(treasury).collateral();
        return (
            expiryTime,
            windowSize,
            strikePrice,
            decimals,
            collateral,
            option
        );
    }

    /**
     * @notice Set the payout address for an account before expiry.
     * @param btcHash Recipient address for exercising
     * @param format Recipient script format
     **/
    function setBtcAddress(bytes20 btcHash, Bitcoin.Script format)
        external
        override
        notExpired
    {
        _setBtcAddress(msg.sender, btcHash, format);
    }

    /**
     * @notice Mints obligation tokens to an `account` transfers the respective option
     * tokens to a `pool` - e.g. Uniswap. To prevent misappropriation of funds we expect
     * this function to be called atomically after depositing in the treasury. The `OptionLib`
     * contract should provide helpers to facilitate this.
     * @dev Once the expiry date has lapsed this function is no longer valid.
     * @param writer Writer address
     * @param amount Total credit
     **/
    function mintToPool(address writer, uint256 amount)
        external
        override
        notExpired
    {
        _mintObligations(writer, amount);

        // we need to calculate this here to prevent minting to any contract
        address premium = ITreasury(treasury).collateral();
        address pair = UniswapV2Library.pairFor(uniswap, option, premium);

        // mint the equivalent options, transferring to the pool
        IOption(option).mintToPool(writer, pair, amount);
    }

    /**
     * @notice Mints obligation tokens to `writer`, crediting the same with the appropriate
     * options. To prevent misappropriation of funds we expect this function to be called
     * atomically after depositing in the treasury. The `OptionLib` contract should provide
     * helpers to facilitate this.
     * @dev Once the expiry date has lapsed this function is no longer valid.
     * @param writer Writer address
     * @param amount Total credit
     **/
    function mintToWriter(address writer, uint256 amount)
        external
        override
        notExpired
    {
        _mintObligations(writer, amount);

        // mint the equivalent options, crediting the writer
        IOption(option).mintToWriter(writer, amount);
    }

    /**
     * @dev Performs a mint, creating `amount` obligations and crediting `writer`
     * appropriately. Does NOT mint the corresponding options.
     **/
    function _mintObligations(address writer, uint256 amount) internal {
        // insert into the accounts balance
        _balances[writer] = _balances[writer].add(amount);
        _obligations[writer] = _obligations[writer].add(amount);
        totalSupply = totalSupply.add(amount);
        _writers.push(writer);

        // check treasury has enough unlocked
        (bytes20 btcHash, Bitcoin.Script format) = ITreasury(treasury).lock(
            writer,
            amount
        );
        _setBtcAddress(writer, btcHash, format);

        emit Transfer(address(0), writer, amount);
    }

    function _burn(address account, uint256 amount) internal {
        // we only allow the owner to withdraw
        _obligations[account] = _obligations[account].sub(
            amount,
            ERR_TRANSFER_EXCEEDS_BALANCE
        );

        totalSupply = totalSupply.sub(amount);
        emit Transfer(account, address(0), amount);
    }

    /**
     * @notice Initiate physical settlement, locking obligations owned by the specified seller.
     * In order to prevent replay attacks we require the use of `OP_RETURN` to embed the request id
     * - the keccak256 hash of the contract address and a nonce which is incremented after each request.
     * @dev Caller is assumed to be the `buyer`.
     * @param seller Account that wrote the options.
     * @param satoshis Input amount.
     **/
    function requestExercise(address seller, uint256 satoshis)
        external
        override
        canExercise
    {
        address buyer = msg.sender;

        uint256 options = calculateAmountIn(satoshis);
        _locked[seller] = _locked[seller].add(options);
        require(
            _locked[seller] <= _obligations[seller],
            ERR_INSUFFICIENT_OBLIGATIONS
        );

        bytes32 id = keccak256(
            abi.encodePacked(
                // create2 ensures params are unique
                address(this),
                // append nonce to avoid collisions
                _nonce
            )
        );
        _nonce = _nonce.add(1);

        _requests[id].amount = options;
        _requests[id].buyer = buyer;
        _requests[id].seller = seller;

        emit RequestExercise(buyer, seller, id, options);

        IOption(option).requestExercise(buyer, options);
    }

    /**
     * @notice Exercises an option after `expiryTime` but before `expiryTime + windowSize`.
     * Requires a transaction inclusion proof which is verified by our chain relay. This payment
     * must contain the unique request id in the `OP_RETURN` payload.
     * @param id Unique request id
     * @param height Bitcoin block height
     * @param index Bitcoin tx index
     * @param txid Bitcoin transaction id
     * @param header Bitcoin block header
     * @param proof Bitcoin inclusion proof
     * @param rawtx Bitcoin raw tx
     **/
    function executeExercise(
        bytes32 id,
        uint32 height,
        uint256 index,
        bytes32 txid,
        bytes calldata header,
        bytes calldata proof,
        bytes calldata rawtx
    ) external override canExercise {
        address seller = _requests[id].seller;
        Bitcoin.Address memory addr = _btcAddresses[seller];

        // verify & validate tx, use default confirmations
        uint256 satoshis = IReferee(referee).verifyTx(
            id,
            height,
            index,
            txid,
            header,
            proof,
            rawtx,
            addr.btcHash,
            addr.format
        );

        _verifyReceipt(id, satoshis);
    }

    function _verifyReceipt(bytes32 id, uint256 satoshis) internal {
        uint256 amount = _requests[id].amount;
        require(amount > 0, ERR_INVALID_REQUEST);

        // pending op_return validation
        uint256 options = calculateAmountIn(satoshis);
        require(amount == options, ERR_INVALID_OUTPUT_AMOUNT);

        address buyer = _requests[id].buyer;
        address seller = _requests[id].seller;
        _locked[seller] = _locked[seller].sub(amount);
        delete _requests[id];

        // remove seller's obligations
        _burn(seller, amount);

        // transfers from the treasury to the buyer
        ITreasury(treasury).release(seller, buyer, amount);

        emit ExecuteExercise(buyer, seller, amount);
    }

    /**
     * @notice Withdraw collateral for obligation tokens if sold.
     * @param amount Amount of collateral
     * @param pool Address of the liquidity pool (i.e. Uniswap)
     **/
    function withdraw(uint256 amount, address pool)
        external
        override
        notExpired
    {
        // TODO: how do liquidity changes affect this?
        address seller = msg.sender;

        // caller should have pool credit
        uint256 balance = _poolBalance[pool][seller];
        _poolBalance[pool][seller] = balance.sub(
            amount,
            ERR_SUB_WITHDRAW_BALANCE
        );

        // pool must have supply > balance
        uint256 available = _poolSupply[pool].sub(_balances[pool]);
        _poolSupply[pool] = available.sub(amount, ERR_SUB_WITHDRAW_AVAILABLE);

        // destroy obligations
        _burn(seller, amount);

        // transfers from the treasury to the seller
        ITreasury(treasury).release(seller, seller, amount);

        emit Withdraw(seller, pool, amount);
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
        // must show immediate balance (not written / remaining)
        // required by uniswap to mint
        return _balances[account];
    }

    /**
     * @notice Return the outstanding obligations for an account. Unlike `balanceOf`
     * this does not account for pool balances - unsold obligations always require an owner.
     * @dev It is a user's responsibility to withdraw sold obligations - thereby redeeming
     * locked collateral - from a liquidity pool.
     * @param account An account which owns obligations.
     * @return The total balance of the account.
     **/
    function obligations(address account)
        external
        override
        view
        returns (uint256)
    {
        return _obligations[account];
    }

    /**
     * @notice Returns the obligations available to exercise for an account.
     * @param account An account which owns obligations.
     * @return The total exercisable balance of the account.
     **/
    function available(address account)
        external
        override
        view
        returns (uint256)
    {
        return _obligations[account].sub(_locked[account]);
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

        _balances[sender] = _balances[sender].sub(
            amount,
            ERR_TRANSFER_EXCEEDS_BALANCE
        );
        _balances[recipient] = _balances[recipient].add(amount);

        if (
            _btcAddresses[sender].btcHash != 0 &&
            _btcAddresses[recipient].btcHash != 0
        ) {
            // simple transfer, lock recipient collateral
            // Note: the market must have 'unlocked' funds
            ITreasury(treasury).lock(recipient, amount);
            ITreasury(treasury).release(sender, sender, amount);

            // transfer ownership
            _obligations[sender] = _obligations[sender].sub(amount);
            _obligations[recipient] = _obligations[recipient].add(amount);
            _writers.push(recipient);
        } else if (
            _btcAddresses[sender].btcHash != 0 &&
            _btcAddresses[recipient].btcHash == 0
        ) {
            // selling obligations to a pool
            _poolSupply[recipient] = _poolSupply[recipient].add(amount);
            _poolBalance[recipient][sender] = _poolBalance[recipient][sender]
                .add(amount);
        } else {
            // buying obligations from a pool
            // call to treasury should revert if insufficient locked
            (bytes20 btcHash, Bitcoin.Script format) = ITreasury(treasury).lock(
                recipient,
                amount
            );
            _setBtcAddress(recipient, btcHash, format);
            _obligations[recipient] = _obligations[recipient].add(amount);
            _writers.push(recipient);
        }

        emit Transfer(sender, recipient, amount);
    }

    /**
     * @notice Calculates the expected input amount of option tokens for the specified satoshi amount. The amount of option tokens is the same as the amount of collateral tokens required, i.e., |OPT| = |COL|.
     * @dev The `strikePrice` and collateral should use the same precision.
     * @param satoshis The number of satoshis to exercise.
     **/
    function calculateAmountIn(uint256 satoshis) public view returns (uint256) {
        return satoshis.mul(strikePrice).div(10**SATOSHI_DECIMALS);
    }

    /**
     * @notice Calculates the expected satoshi amount for the specified input amount of option tokens. The amount of option tokens is the same as the amount of collateral tokens required, i.e., |OPT| = |COL|.
     * @dev This will underflow if the collateral's precision is less than 10.
     * @param amount The number of tokens to exercise.
     **/
    function calculateAmountOut(uint256 amount)
        external
        view
        returns (uint256)
    {
        // we lose some precision here
        // ((4500*10**6)*10**10)/(9000*10**6) = 5000000000.0 = 0.5 BTC
        // ((4500*10**18)*10**10)/(9000*10**18) = 5000000000.0 = 0.5 BTC
        // ((1200*10**18)*10**10)/(2390*10**18) = 5020920502.092051 ~= 0.502 BTC
        return amount.mul(10**SATOSHI_DECIMALS).div(strikePrice);
    }
}
