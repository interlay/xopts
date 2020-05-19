pragma solidity ^0.5.15;

import "@nomiclabs/buidler/console.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";

// import "../lib/BokkyPooBahsRedBlackTreeLibrary.sol";

contract Treasury is IERC20 {
    using SafeMath for uint;

    // TODO: construct interval tree?
    // using BokkyPooBahsRedBlackTreeLibrary for BokkyPooBahsRedBlackTreeLibrary.Tree;

    // account -> key -> value
    // mapping(address => mapping(uint => uint)) values;
    // account -> tree
    // mapping(address => BokkyPooBahsRedBlackTreeLibrary.Tree) trees;

    // BokkyPooBahsRedBlackTreeLibrary.Tree global;
    // mapping(uint => uint) values;

    // The balance type consists of an implicit tuple in the form of (block_number, amount).
    // The block_number indicates the time until this time is valid and the amount
    // indicates the amount for that validity time. Each account can have a dynamic
    // number of these tuples. The tuple are accessed over an index with a mapping.
    // NOTE: we can use a RB tree as the underlying data structure if we want
    // to ensure that the balances are always sorted by the block_number.
    // However, this introduces an overhead of ~40k gas in the best case insertion.
    // mapping of an account to the length of balances in account_balances
    mapping(address => uint) balances_length;
    // mapping of account to its indexes of balances
    mapping(address => mapping(uint => uint[2])) balances;

    function mint(uint amount) external {
        _mint(address(msg.sender), amount);
    }

    function _mint(address account, uint amount) internal {
        // validate proof
        // verify inclusion
        // validate tx (extract time & value)

        // rb tree insertion
        // TODO: use timestamp from btc-tx
        // NOTE: use block numbers instead of timestamps to minimize
        // possible entropy of expiry times
        uint block_number = block.timestamp + 1000;

        // TODO: possible timestamp collision?
        // trees[account].insert(timestamp);
        // values[account][timestamp] = amount;

        // insert into the accounts balance
        _insert_balance(account, block_number, amount);

        // insert globally
        _insert_balance(address(this), block_number, amount);

        // global.insert(timestamp);
    }

    /**
    * @dev Insert a tuple of (expiry_block, amount) into an account_balance
    * @param account: The address of the account.
    * @param expiry_block: The validity time of the newly minted amount.
    * @param amount: The amount of newly minted tokens.
    **/
    function _insert_balance(address account, uint expiry_block, uint amount) internal {
        // insert at the end
        uint length = balances_length[account];

        balances_length[account] = length.add(1);
        balances[account][length] = [expiry_block, amount];
        return;
    }

    function allowance(address owner, address spender) external view returns (uint256) {
        return 0;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        return false;
    }

    function balanceOf(address account) external view returns (uint256) {
        // uint amount;
        // uint timestamp = block.timestamp;
        // uint key = trees[account].root;
        // if (key > timestamp) amount += values[account][key];
        // while (true) {
        //     uint key = trees[account].next(timestamp);
        //     if (key == 0) break;
        //     amount += values[account][key];
        // }
        // return amount;
        return _get_balance(account);
    }

    function totalSupply() external view returns (uint256) {
        return _get_balance(address(this));
    }

    function _get_balance(address account) internal view returns (uint256) {
        uint block_number = block.number;
        uint balance = 0;
        uint length = balances_length[account];

        for (uint i = 0; i < length; i++) {
            uint[2] memory minting = balances[account][i];
            uint this_expiry_block = minting[0];
            uint this_amount = minting[1];

            if (block_number <= this_expiry_block) {
                balance = balance.add(this_amount);
            }
        }
        return balance;
    }


    function transfer(address recipient, uint256 amount) external returns (bool) {
        revert("Unsupported");
    }

    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool) {
        revert("Unsupported");
    }

    // TODO: check if we need sorted insert.
    /**
    * @dev Sorted insert a tuple of (expiry_block, amount) into an account_balance
    * @param account: The address of the account.
    * @param expiry_block: The validity time of the newly minted amount.
    * @param amount: The amount of newly minted tokens.
    **/
    function _insert_sorted(address account, uint expiry_block, uint amount) internal {
        // if the balance is empty, insert at the end
        uint length = balances_length[account];
        if (length == 0) {
            balances_length[account] = length.add(1);
            balances[account][length] = [expiry_block, amount];
            return;
        }

        // if the balance is not empty, search where to insert the balance
        for (uint i = 0; i < length; i++) {
            uint[2] memory minting = balances[account][i];
            uint this_expiry_block = minting[0];
            uint this_amount = minting[1];

            if (this_expiry_block == expiry_block) {
                // if we already have an item with the same expiry block, we need to update the
                // amount on that item instead of inserting a new item
                uint new_amount = this_amount.add(amount);
                uint[2] memory new_minting = [expiry_block, new_amount];

                balances[account][i] = new_minting;
                return;
            } else if (this_expiry_block > expiry_block) {
                // else we try to find the element that is expiring after the
                // currently submitted element
                uint new_length = length.add(1);

                uint[2] memory insert_element = minting;
                // swap elements in the mapping until new_length is reached
                for (uint j = i; j < new_length; j++) {
                    // get the element that will be swapped
                    uint[2] memory swap_element = balances[account][j];
                    // insert the insert_element
                    balances[account][j] = insert_element;
                    // make the swap_element the new insert_element
                    insert_element = swap_element;
                }
                // insert the new length
                balances_length[account] = new_length;
                return;
            } else if (i == length.sub(1)) {
                // if we are at the end of the account balances, insert the newly
                // minted amount as the last element
                uint new_length = length.add(1);
                balances_length[account] = new_length;
                balances[account][new_length] = [expiry_block, amount];
                return;
            }
        }
        // should never end up here
        revert("Runtime error processing insert of newly minted tokens");
    }
}
