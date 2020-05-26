pragma solidity ^0.5.15;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/GSN/Context.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IterableBalances} from "./IterableBalances.sol";
import {IRelay} from "./lib/IRelay.sol";
import {ITxValidator} from "./lib/ITxValidator.sol";
import {Expirable} from "./Expirable.sol";
import {IERC20Buyable} from "./IERC20Buyable.sol";
import {IERC20Sellable} from "./IERC20Sellable.sol";

contract ERC20Buyable is IERC20Buyable, Context, Expirable {
    using SafeMath for uint;
    using IterableBalances for IterableBalances.Map;

    string constant ERR_INSUFFICIENT_BALANCE = "Insufficient balance";
    string constant ERR_ZERO_PREMIUM = "Requires non-zero premium";
    string constant ERR_ZERO_STRIKE_PRICE = "Requires non-zero strike price";
    string constant ERR_ZERO_AMOUNT = "Requires non-zero amount";
    string constant ERR_NO_BTC_ADDRESS = "Insurer lacks BTC address";
    string constant ERR_VERIFY_TX = "Cannot verify tx inclusion";
    string constant ERR_VALIDATE_TX = "Cannot validate tx format";
    string constant ERR_TRANSFER_EXCEEDS_BALANCE = "ERC20: transfer amount exceeds balance";
    string constant ERR_APPROVE_TO_ZERO_ADDRESS = "ERC20: approve to the zero address";
    string constant ERR_TRANSFER_TO_ZERO_ADDRESS = "ERC20: transfer to the zero address";
    string constant ERR_APPROVE_FROM_ZERO_ADDRESS = "ERC20: approve from the zero address";
    string constant ERR_TRANSFER_FROM_ZERO_ADDRESS = "ERC20: transfer from the zero address";

    event Insure(address indexed account, uint256 amount);
    event Exercise(address indexed account, uint256 amount);

    // backing asset (eg. Dai or USDC)
    IERC20 _collateral;

    // btc relay
    IRelay _relay;

    // tx validation
    ITxValidator _validator;

    // parent contract
    IERC20Sellable _sellable;

    // the price to buy the option
    uint256 public _premium;

    // the strike price for one satoshi
    uint256 public _strikePrice;

    // iterable mapping to accounts owed
    mapping (address => IterableBalances.Map) _balances;
    // total balances
    mapping (address => uint256) _balancesTotal;

    // accounts that can spend an owners funds
    mapping (address => mapping (address => uint256)) internal _allowances;

    // total number of tokens bought
    uint256 internal _totalSupply;

    constructor(
        IERC20 collateral,
        IRelay relay,
        ITxValidator validator,
        IERC20Sellable sellable,
        uint256 expiry,
        uint256 premium,
        uint256 strikePrice
    ) public Expirable(expiry) {
        require(premium > 0, ERR_ZERO_PREMIUM);
        require(strikePrice > 0, ERR_ZERO_STRIKE_PRICE);

        _collateral = collateral;
        _relay = relay;
        _validator = validator;
        _sellable = sellable;

        _premium = premium;
        _strikePrice = strikePrice;
    }

    function totalSupply() external view returns (uint256) {
        return _totalSupply;
    }

    /**
    * @dev Claim options by paying the premium
    * @param against: insurer to use
    * @param satoshis: erc-20 underlying
    **/
    function insure(address against, uint256 satoshis) external notExpired {
        require(satoshis > 0, ERR_ZERO_AMOUNT);
        require(against != address(0), ERR_TRANSFER_FROM_ZERO_ADDRESS);

        // needed for output
        require(_sellable.getBtcAddress(against).length > 0, ERR_NO_BTC_ADDRESS);

        address caller = _msgSender();
        // require the satoshis * premium
        uint256 premium = _calculatePremium(satoshis);
        _collateral.transferFrom(caller, against, premium);

        // require the satoshis * strike price
        uint256 options = _calculateInsure(satoshis);
        // lock token from seller
        _sellable.buyOptions(against, options);
        _mint(caller, against, options);

        emit Insure(caller, options);
    }

    function _mint(
        address buyer,
        address seller,
        uint256 amount
    ) internal {
        // insert into the accounts balance
        _balances[buyer].set(seller, _balances[buyer].get(seller).add(amount));
        _balancesTotal[buyer] = _balancesTotal[buyer].add(amount);
        _totalSupply = _totalSupply.add(amount);
        emit Transfer(seller, buyer, amount);
    }

    /**
    * @dev Exercise an option before expiry
    **/
    function exercise(
        uint256 height,
        uint256 index,
        bytes32 txid,
        bytes calldata proof,
        bytes calldata rawtx,
        address seller
    ) external notExpired {
        address caller = _msgSender();
        uint256 balance = _burn(caller, seller);
        require(balance > 0, ERR_INSUFFICIENT_BALANCE);

        bytes memory btcAddress = _sellable.getBtcAddress(seller);
        uint256 btcAmount = _calculateExercise(balance);

        // we currently do not support multiple outputs
        // verify & validate tx, use default confirmations
        require(_relay.verifyTx(height, index, txid, proof, 0, false), ERR_VERIFY_TX);
        require(_validator.validateTx(rawtx, btcAddress, btcAmount), ERR_VALIDATE_TX);

        _sellable.sellOptions(caller, seller, balance);

        emit Exercise(caller, balance);
    }

    function _burn(
        address owner,
        address seller
    ) internal returns (uint) {
        IterableBalances.Map storage map = _balances[owner];
        uint balance = map.get(seller);
        map.remove(seller);
        _totalSupply = _totalSupply.sub(balance);

        emit Transfer(owner, address(0), balance);
        return balance;
    }

    function getOptionOwnersFor(address account) external view returns (address[] memory sellers, uint256[] memory options) {
        IterableBalances.Map storage map = _balances[account];

        uint length = map.size();
        sellers = new address[](length);
        options = new uint256[](length);

        for (uint i = 0; i < length; i++) {
            address key = map.getKeyAtIndex(i);
            uint value = map.get(key);
            sellers[i] = key;
            options[i] = _calculateExercise(value);
        }

        return (sellers, options);
    }

    function getDetails() external view returns (uint, uint, uint, uint) {
        return (_expiry, _premium, _strikePrice, _totalSupply);
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
        return _balancesTotal[account];
    }

    // Overwrite ERC-20 functionality with expiry
    function transfer(address recipient, uint256 amount) external notExpired returns (bool) {
        _transfer(_msgSender(), recipient, amount);
        emit Transfer(_msgSender(), recipient, amount);
        return true;
    }

    // Overwrite ERC-20 functionality with expiry
    function transferFrom(address sender, address recipient, uint256 amount) external notExpired returns (bool) {
        _transfer(sender, recipient, amount);
        _approve(sender, _msgSender(), _allowances[sender][_msgSender()].sub(amount, ERR_TRANSFER_EXCEEDS_BALANCE));
        emit Transfer(sender, recipient, amount);
        return true;
    }

    /**
    * @dev Decrement the sender's owned balance until the amount can be payed.
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

        _balancesTotal[sender] = _balancesTotal[sender].sub(amount);
        _balancesTotal[recipient] = _balancesTotal[recipient].add(amount);

        // transfer between locked accounts
        IterableBalances.Map storage from = _balances[sender];
        IterableBalances.Map storage next = _balances[recipient];

        uint remainder = amount;
        for (uint i = 0; i < from.size(); i++) {
            address key = from.getKeyAtIndex(i);
            uint value = from.get(key);

            if (remainder >= value) {
                remainder = remainder.sub(value);
                from.set(key, 0);
                next.set(key, next.get(key).add(value));
                if (remainder == 0) return;
            } else {
                value = value.sub(remainder);
                from.set(key, value);
                next.set(key, next.get(key).add(value));
                return;
            }
        }

        revert(ERR_TRANSFER_EXCEEDS_BALANCE);
    }

    /**
    * @dev Computes the insure payout from the amount and the strikePrice
    * @param amount: asset to exchange
    */
    function _calculateInsure(uint256 amount) private view returns (uint256) {
        return amount.mul(_strikePrice);
    }

    /**
    * @dev Computes the premium per option
    * @param amount: asset to exchange
    */
    function _calculatePremium(uint256 amount) private view returns (uint256) {
        return amount.mul(_premium);
    }

    /**
    * @dev Computes the exerise payout from the amount and the strikePrice
    * @param amount: asset to exchange
    */
    function _calculateExercise(uint256 amount) private view returns (uint256) {
        return amount.div(_strikePrice);
    }
}
