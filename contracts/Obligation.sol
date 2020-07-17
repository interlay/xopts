pragma solidity ^0.5.15;

import "@nomiclabs/buidler/console.sol";

import { Ownable } from "@openzeppelin/contracts/ownership/Ownable.sol";
import { Context } from "@openzeppelin/contracts/GSN/Context.sol";
import { SafeMath } from "@openzeppelin/contracts/math/SafeMath.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { IterableBalances } from "./IterableBalances.sol";
import { Expirable } from "./Expirable.sol";
import { IObligation } from "./interface/Obligation.sol";
import { Bitcoin } from "./Bitcoin.sol";

contract Obligation is IObligation, IERC20, Context, Expirable, Ownable {
    using SafeMath for uint;
    using IterableBalances for IterableBalances.Map;

    string constant ERR_INSUFFICIENT_BALANCE = "Insufficient balance";
    string constant ERR_TRANSFER_EXCEEDS_BALANCE = "Amount exceeds balance";
    string constant ERR_APPROVE_TO_ZERO_ADDRESS = "Approve to zero address";
    string constant ERR_TRANSFER_TO_ZERO_ADDRESS = "Transfer to zero address";
    string constant ERR_APPROVE_FROM_ZERO_ADDRESS = "Approve from zero address";
    string constant ERR_TRANSFER_FROM_ZERO_ADDRESS = "Transfer from zero address";
    string constant ERR_NO_BTC_ADDRESS = "Insurer lacks BTC address";

    // event Underwrite(address indexed minter, uint256 amount);

    // payout addresses for underwriters
    mapping(address => Bitcoin.Address) _btcAddresses;

    // total obligations per account
    IterableBalances.Map internal _balances;

    // accounts that can spend an owners funds
    mapping (address => mapping (address => uint256)) internal _allowances;

    // total number of tokens minted
    uint256 internal _totalSupply;

    constructor(
        uint256 expiry,
        uint256 window
    ) public Expirable(expiry, window) Ownable() {}

    function totalSupply() external view returns (uint256) {
        return _totalSupply;
    }

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
        _btcAddresses[account].btcHash = btcHash;
        _btcAddresses[account].format = format;
    }

    function setBtcAddress(bytes20 btcHash, Bitcoin.Script format) external {
        address sender = _msgSender();
        require(_balances.get(sender) > 0, ERR_INSUFFICIENT_BALANCE);
        _setBtcAddress(sender, btcHash, format);
    }

    function getBtcAddress(address account) external view returns (bytes20 btcHash, Bitcoin.Script format) {
        return (_btcAddresses[account].btcHash, _btcAddresses[account].format);
    }


    function _burn(address account, uint amount) internal onlyOwner {
        _balances.set(account, _balances.get(account).sub(amount));
        _totalSupply = _totalSupply.sub(amount);
        emit Transfer(account, address(0), amount);
    }

    function exercise(address account, uint amount) external canExercise {
        _burn(account, amount);
    }

    function refund(address account, uint amount) external canRefund {
        _burn(account, amount);
    }

    function getAllObligations() external view returns (address[] memory writers, uint256[] memory tokens) {
        uint length = _balances.size();
        writers = new address[](length);
        tokens = new uint256[](length);

        for (uint i = 0; i < length; i++) {
            address key = _balances.getKeyAtIndex(i);
            uint value = _balances.get(key);
            writers[i] = key;
            tokens[i] = value;
        }

        return (writers, tokens);
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
        return _balances.get(account);
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

        // // transfer between unlocked accounts
        // _balancesTotal[sender] = _balancesTotal[sender].sub(amount);
        // _balancesTotal[recipient] = _balancesTotal[recipient].add(amount);

        // _balancesUnsold.set(sender, _balancesUnsold.get(sender).sub(amount));
        // _balancesUnsold.set(recipient, _balancesUnsold.get(recipient).add(amount));

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
