pragma solidity ^0.5.15;

import "@nomiclabs/buidler/console.sol";

import { Ownable } from "@openzeppelin/contracts/ownership/Ownable.sol";
import { Context } from "@openzeppelin/contracts/GSN/Context.sol";
import { SafeMath } from "@openzeppelin/contracts/math/SafeMath.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { IterableBalances } from "./IterableBalances.sol";
import { Obligation } from "./Obligation.sol";
import { IObligation } from "./interface/IObligation.sol";
import { IOption } from "./interface/IOption.sol";
import { Expirable } from "./Expirable.sol";
import { IReferee } from "./interface/IReferee.sol";
import { Bitcoin } from "./Bitcoin.sol";

/// @title Option-side ERC-20 tokens
/// @notice Represents unsold and exercisable option tokens
/// @author Interlay
contract Option is IOption, IERC20, Context, Expirable, Ownable {
    using SafeMath for uint;
    using IterableBalances for IterableBalances.Map;

    string constant ERR_TRANSFER_EXCEEDS_BALANCE = "Amount exceeds balance";
    string constant ERR_APPROVE_TO_ZERO_ADDRESS = "Approve to zero address";
    string constant ERR_TRANSFER_TO_ZERO_ADDRESS = "Transfer to zero address";
    string constant ERR_APPROVE_FROM_ZERO_ADDRESS = "Approve from zero address";
    string constant ERR_TRANSFER_FROM_ZERO_ADDRESS = "Transfer from zero address";
    string constant ERR_VALIDATE_TX = "Cannot validate tx format";
    string constant ERR_ZERO_STRIKE_PRICE = "Requires non-zero strike price";

    // event Insure(address indexed account, uint256 amount);
    // event Exercise(address indexed account, uint256 amount);

    uint256 internal _strikePrice;

    // btc relay or oracle
    address public referee;
    address public treasury;
    address public obligation;

    // total options per account
    mapping (address => uint256) internal _balances;

    // total number of options available
    uint256 internal _totalSupply;

    // accounts that can spend an owners funds
    mapping (address => mapping (address => uint256)) internal _allowances;

    constructor(
        uint256 expiry,
        uint256 window,
        uint256 strikePrice,
        address _referee,
        address _treasury,
        address _obligation
    ) public Expirable(expiry, window) Ownable() {
        require(strikePrice > 0, ERR_ZERO_STRIKE_PRICE);

        _strikePrice = strikePrice;

        referee = _referee;
        treasury = _treasury;
        obligation = _obligation;
    }

    /// @dev See {IERC20-totalSupply}
    function totalSupply() external view returns (uint256) {
        return _totalSupply;
    }

    /// @dev See {IOption-mint}
    function mint(address from, address to, uint256 amount, bytes20 btcHash, Bitcoin.Script format) external notExpired onlyOwner {
        // insert into the accounts balance
        _balances[to] = _balances[to].add(amount);
        _totalSupply = _totalSupply.add(amount);
        emit Transfer(address(0), to, amount);

        // mint the equivalent obligations
        IObligation(obligation).mint(from, amount, btcHash, format);
    }

    /// @dev See {IOption-exercise}
    function exercise(
        address buyer,
        address seller,
        uint256 amount,
        uint256 height,
        uint256 index,
        bytes32 txid,
        bytes calldata proof,
        bytes calldata rawtx
    ) external canExercise onlyOwner {
        uint buyerBalance = _balances[buyer];

        // burn buyer's options
        _burn(buyer, amount);
        // burn seller's obligations
        IObligation(obligation).exercise(buyer, seller, buyerBalance, amount);

        // expected amount of btc
        uint btcAmount = _calculateExercise(amount);
        (bytes20 btcHash,) = IObligation(obligation).getBtcAddress(seller);

        // verify & validate tx, use default confirmations
        require(IReferee(referee).verifyTx(
            height,
            index,
            txid,
            proof,
            rawtx,
            btcHash,
            btcAmount), ERR_VALIDATE_TX);
    }

    /// @dev See {IOption-refund}
    function refund(address account, uint amount) external canRefund onlyOwner {
        IObligation(obligation).refund(account, amount);
    }

    function _burn(
        address account,
        uint256 amount
    ) internal {
        _balances[account] = _balances[account].sub(amount);
        _totalSupply = _totalSupply.sub(amount);
        emit Transfer(account, address(0), amount);
    }

    /// @dev See {IERC20-allowance}
    function allowance(address owner, address spender) external view returns (uint256) {
        return _allowances[owner][spender];
    }

    /// @dev See {IERC20-approve}
    function approve(address spender, uint256 amount) external notExpired returns (bool) {
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
        return _balances[account];
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

        _balances[sender] = _balances[sender].sub(amount);
        _balances[recipient] = _balances[recipient].add(amount);

        emit Transfer(sender, recipient, amount);
    }

    /**
    * @dev Computes the exercise payout from the amount and the strikePrice
    * @param amount Asset to exchange
    */
    function _calculateExercise(uint256 amount) internal view returns (uint256) {
        return amount.div(_strikePrice);
    }
}
