pragma solidity ^0.5.15;

import "@nomiclabs/buidler/console.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/GSN/Context.sol";

library IterableMapping {
    using SafeMath for uint;

    struct Map {
        address[] keys;
        mapping(address => uint) values;
        mapping(address => uint) indexOf;
        mapping(address => bool) inserted;
    }

    function get(Map storage map, address key) internal view returns (uint) {
        return map.values[key];
    }

    function getKeyAtIndex(Map storage map, uint index) internal view returns (address) {
        return map.keys[index];
    }

    function size(Map storage map) internal view returns (uint) {
        return map.keys.length;
    }

    function set(Map storage map, address key, uint val) internal {
        if (map.inserted[key]) {
            map.values[key] = val;
        } else {
            map.inserted[key] = true;
            map.values[key] = val;
            map.indexOf[key] = map.keys.length;
            map.keys.push(key);
        }
    }

    function remove(Map storage map, address key) internal {
        if (!map.inserted[key]) {
            return;
        }

        delete map.inserted[key];
        delete map.values[key];

        uint index = map.indexOf[key];
        uint lastIndex = map.keys.length - 1;
        address lastKey = map.keys[lastIndex];

        map.indexOf[lastKey] = index;
        delete map.indexOf[key];

        map.keys[index] = lastKey;
        map.keys.pop();
    }
}

contract ERC20Lockable is IERC20, Context {
    using SafeMath for uint;
    using IterableMapping for IterableMapping.Map;

    // indicates that the account is holding
    // tokens minted by another account
    mapping (address => bool) _locked;

    // contains mapping to lenders and amounts borrowed
    mapping (address => IterableMapping.Map) _owned;

    mapping (address => uint256) _balances;
    mapping (address => uint256) _balancesLocked;
    mapping (address => uint256) _balancesUnlocked;

    // accounts that can spend an owners funds
    mapping (address => mapping (address => uint256)) internal _allowances;

    // total number of tokens minted
    uint256 internal _totalSupply;
    uint256 internal _totalSupplyLocked;
    uint256 internal _totalSupplyUnlocked;

    string constant ERR_TRANSFER_EXCEEDS_BALANCE = "ERC20: transfer amount exceeds balance";
    string constant ERR_APPROVE_TO_ZERO_ADDRESS = "ERC20: approve to the zero address";
    string constant ERR_TRANSFER_TO_ZERO_ADDRESS = "ERC20: transfer to the zero address";
    string constant ERR_APPROVE_FROM_ZERO_ADDRESS = "ERC20: approve from the zero address";
    string constant ERR_TRANSFER_FROM_ZERO_ADDRESS = "ERC20: transfer from the zero address";
    string constant ERR_ACCOUNT_LOCKED = "ERC20: account is locked";
    string constant ERR_ACCOUNT_NOT_LOCKED = "ERC20: account is not locked";
    string constant ERR_INCOMPATIBLE_ACCOUNTS = "ERC20: accounts are incompatible";

    function totalSupply() public view returns (uint256) {
        return _totalSupply;
    }

    function totalSupplyLocked() public view returns (uint256) {
        return _totalSupplyLocked;
    }

    function totalSupplyUnlocked() public view returns (uint256) {
        return _totalSupplyUnlocked;
    }

    /**
    * @dev Mint unlocked tokens to owner.
    * @param owner: The address of the owner.
    * @param amount: The amount of newly minted tokens.
    **/
    function _mintUnlocked(
        address owner,
        uint256 amount
    ) internal {
        require(!_locked[owner], ERR_ACCOUNT_LOCKED);

        // insert into the accounts balance
        _balances[owner] = _balances[owner].add(amount);
        _balancesUnlocked[owner] = _balancesUnlocked[owner].add(amount);

        _totalSupply = _totalSupply.add(amount);
        _totalSupplyUnlocked = _totalSupplyUnlocked.add(amount);
        emit Transfer(address(0), owner, amount);
    }

    function _burnAll(address account) internal returns (uint) {
        uint balance = _balances[account];
        delete _balances[account];
        delete _balancesLocked[account];
        delete _balancesUnlocked[account];
        emit Transfer(account, address(0), balance);
        return balance;
    }

    function _burnAllLocked(address account) internal returns (uint) {
        uint balance = _balancesLocked[account];
        _balancesLocked[account] = 0;

        IterableMapping.Map storage map = _owned[account];
        for (uint i = 0; i < map.size(); i++) {
            address key = map.getKeyAtIndex(i);
            uint value = map.get(key);
            _balances[key] = _balances[key].sub(value);
        }

        delete _owned[account];
        emit Transfer(account, address(0), balance);
        return balance;
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

    function isLocked(address account) internal view returns (bool) {
        return _locked[account];
    }

    function balanceOf(address account) external view returns (uint256) {
        return _balanceOf(account);
    }

    function _balanceOf(address account) internal view returns (uint256) {
        return _balancesLocked[account] + _balancesUnlocked[account];
    }

    function _balanceOfTotal(address account) internal view returns (uint256) {
        return _balances[account];
    }

    function transfer(address recipient, uint256 amount) external returns (bool) {
        _transfer(_msgSender(), recipient, amount);
        emit Transfer(_msgSender(), recipient, amount);
        return true;
    }

    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool) {
        _transfer(sender, recipient, amount);
        _approve(sender, _msgSender(), _allowances[sender][_msgSender()].sub(amount, ERR_TRANSFER_EXCEEDS_BALANCE));
        emit Transfer(sender, recipient, amount);
        return true;
    }

    function _exchange(
        address sender,
        address recipient,
        uint256 amount
    ) internal {
        require(sender != address(0), ERR_TRANSFER_FROM_ZERO_ADDRESS);
        require(recipient != address(0), ERR_TRANSFER_TO_ZERO_ADDRESS);

        // sender can't be locked
        require(!_locked[sender], ERR_ACCOUNT_LOCKED);

        // lock recipient
        _locked[recipient] = true;

        _totalSupplyUnlocked = _totalSupplyUnlocked.sub(amount);
        _totalSupplyLocked = _totalSupplyLocked.add(amount);

        // update balances
        _balancesUnlocked[sender] = _balancesUnlocked[sender].sub(amount);
        _balancesLocked[recipient] = _balancesLocked[recipient].add(amount);

        _owned[recipient].set(sender, _owned[recipient].get(sender).add(amount));
    }

    /**
    * @dev Decrement the sender's balance until the amount can be payed.
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

        require(_locked[sender] == _locked[recipient], ERR_INCOMPATIBLE_ACCOUNTS);

        if (!_locked[sender]) {
            // transfer between unlocked accounts
            _balances[sender] = _balances[sender].sub(amount);
            _balances[recipient] = _balances[recipient].add(amount);
            _balancesUnlocked[sender] = _balancesUnlocked[sender].sub(amount);
            _balancesUnlocked[recipient] = _balancesUnlocked[recipient].add(amount);
            return;
        } else {
            // transfer between locked accounts
            IterableMapping.Map storage from = _owned[sender];
            IterableMapping.Map storage next = _owned[recipient];

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
        }
        revert(ERR_TRANSFER_EXCEEDS_BALANCE);
    }
}
