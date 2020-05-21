pragma solidity ^0.5.15;

import "@nomiclabs/buidler/console.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/GSN/Context.sol";

contract ERC20Authorable is IERC20, Context {
    using SafeMath for uint;

    // definition of a token
    struct Token {
        uint amount;
        bool locked;
        address author;
    }

    // maintain a mapping of author to amount
    mapping(address => uint256) _authored;

    // mapping of an account to the length of balances
    mapping(address => uint256) _balancesLength;

    // mapping of account to its indexes of balances
    mapping(address => mapping(uint256 => Token)) _balances;

    mapping (address => mapping (address => uint256)) internal _allowances;

    uint256 internal _totalSupply;

    // this is decremented when the tokens are locked
    uint256 internal _totalSupplyUnlocked;

    function totalSupply() public view returns (uint256) {
        return _totalSupply;
    }

    function totalSupplyUnlocked() public view returns (uint256) {
        return _totalSupplyUnlocked;
    }

    /**
    * @dev Associates an amount of token with an owner.
    * @param owner: The address of the owner.
    * @param author: The address of the author.
    * @param amount: The amount of newly minted tokens.
    **/
    function _mint(
        address owner,
        address author,
        uint256 amount
    ) internal {
        // insert into the accounts balance
        _insertBalance(owner, author, amount);

        _totalSupply = _totalSupply.add(amount);
        _totalSupplyUnlocked = _totalSupplyUnlocked.add(amount);
        _authored[author] = _authored[author].add(amount);
        emit Transfer(address(0), owner, amount);
    }

    /**
    * @dev Insert a tuple of (amount, locked, author) into balances
    * @param owner: The address of the owner.
    * @param author: The address of the author.
    * @param amount: The amount of newly minted tokens.
    **/
    function _insertBalance(
        address owner,
        address author,
        uint256 amount
    ) internal {
        // insert at the end
        uint length = _balancesLength[owner];

        _balancesLength[owner] = length.add(1);
        _balances[owner][length] = Token(amount, false, author);
    }

    /**
    * @dev Burns an amount of token belonging to a user.
    * @param account: The address of the owner.
    * @param amount: The amount of tokens to destroy.
    **/
    function _burn(
        address account,
        uint amount
    ) internal {
        // TODO: check tokens are locked?
        _removeBalance(account, amount);
        _totalSupply = _totalSupply.sub(amount);
        emit Transfer(account, address(0), amount);
    }

    function _removeBalance(
        address account,
        uint amount
    ) internal {
        uint length = _balancesLength[account];
        require(length > 0, "ERC20: transfer amount exceeds balance");

        uint remainder = amount;
        for (uint i = length - 1; i >= 0; i--) {
            if (remainder == 0) return;
            Token memory token = _balances[account][i];
            if (remainder >= token.amount) {
                // decrease length
                length = length.sub(1);
                _balancesLength[account] = length;

                remainder = remainder.sub(token.amount);
                _authored[token.author] = _authored[token.author].sub(token.amount);
                delete _balances[account][i];
                if (remainder == 0) return;
            } else {
                token.amount = token.amount.sub(remainder);
                _balances[account][i] = token;
                _authored[token.author] = _authored[token.author].sub(token.amount);
                return;
            }
        }
        revert("ERC20: transfer amount exceeds balance");
    }

    function allowance(address owner, address spender) external view returns (uint256) {
        return _allowances[owner][spender];
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        _approve(_msgSender(), spender, amount);
        return true;
    }

    function _approve(address owner, address spender, uint256 amount) internal {
        require(owner != address(0), "ERC20: approve from the zero address");
        require(spender != address(0), "ERC20: approve to the zero address");

        _allowances[owner][spender] = amount;
        emit Approval(owner, spender, amount);
    }

    function balanceOf(address account) external view returns (uint256) {
        return _getBalance(account);
    }

    function _getBalance(address account) internal view returns (uint256) {
        uint balance = 0;
        uint length = _balancesLength[account];

        for (uint i = 0; i < length; i++) {
            balance = balance.add(_balances[account][i].amount);
        }
        return balance;
    }

    function _getBalanceAuthored(address account) internal view returns (uint256) {
        return _authored[account];
    }

    function _setBalanceAuthored(address account, uint256 amount) internal {
        _authored[account] = amount;
    }

    function transfer(address recipient, uint256 amount) external returns (bool) {
        _transfer(_msgSender(), recipient, amount, false);
        emit Transfer(_msgSender(), recipient, amount);
        return true;
    }

    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool) {
        _transfer(sender, recipient, amount, false);
        _approve(sender, _msgSender(), _allowances[sender][_msgSender()].sub(amount, "ERC20: transfer amount exceeds allowance"));
        emit Transfer(sender, recipient, amount);
        return true;
    }

    /**
    * @dev Decrement the sender's balance until the amount can be payed.
    * @param sender: The address of the sender.
    * @param recipient: The address of the recipient.
    * @param amount: The amount of tokens to transfer.
    * @param lock: Indicate that the tokens have been spent (i.e. bought options).
    **/
    function _transfer(
        address sender,
        address recipient,
        uint256 amount,
        bool lock
    ) internal {
        require(sender != address(0), "ERC20: transfer from the zero address");
        require(recipient != address(0), "ERC20: transfer to the zero address");
        uint length = _balancesLength[sender];
        require(length > 0, "ERC20: transfer amount exceeds balance");
        uint remainder = amount;
        for (uint i = length - 1; i >= 0; i--) {
            Token memory token = _balances[sender][i];
            if (lock) token.locked = true;
            if (remainder >= token.amount) {
                // decrease length
                length = length.sub(1);
                _balancesLength[sender] = length;

                // subtract amount and update balances
                remainder = remainder.sub(token.amount);
                _insertBalanceFromToken(recipient, token.author, token.amount, token.locked);

                delete _balances[sender][i];
                if (remainder == 0) return;
            } else {
                // update amount in token set
                token.amount = token.amount.sub(remainder);
                _balances[sender][i] = token;
                _insertBalanceFromToken(recipient, token.author, remainder, token.locked);
                return;
            }
        }
        revert("ERC20: transfer amount exceeds balance");
    }

    function _insertBalanceFromToken(
        address recipient,
        address author,
        uint256 amount,
        bool locked
    ) internal {
        if (locked) {
            // tokens have been bought
            _insertBalance(recipient, author, amount);
            _totalSupplyUnlocked = _totalSupplyUnlocked.sub(amount);
        } else {
            // tokens are exchanged
            _insertBalance(recipient, recipient, amount);
            _authored[author] = _authored[author].sub(amount);
            _authored[recipient] = _authored[recipient].add(amount);
        }
    }
}
