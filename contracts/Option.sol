// SPDX-License-Identifier: Apache-2.0

pragma solidity ^0.6.0;

import "@nomiclabs/buidler/console.sol";

import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { SafeMath } from "@openzeppelin/contracts/math/SafeMath.sol";
import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { Obligation } from "./Obligation.sol";
import { IObligation } from "./interface/IObligation.sol";
import { IOption } from "./interface/IOption.sol";
import { European } from "./European.sol";
import { IReferee } from "./interface/IReferee.sol";
import { Bitcoin } from "./types/Bitcoin.sol";

/// @title Option ERC20
/// @author Interlay
/// @notice Represents options that may be exercised for the
/// backing currency in exchange for the underlying BTC.
contract Option is IOption, IERC20, European, Ownable {
    using SafeMath for uint;

    string constant ERR_TRANSFER_EXCEEDS_BALANCE = "Amount exceeds balance";
    string constant ERR_APPROVE_TO_ZERO_ADDRESS = "Approve to zero address";
    string constant ERR_TRANSFER_TO_ZERO_ADDRESS = "Transfer to zero address";
    string constant ERR_APPROVE_FROM_ZERO_ADDRESS = "Approve from zero address";
    string constant ERR_TRANSFER_FROM_ZERO_ADDRESS = "Transfer from zero address";

    // event Insure(address indexed account, uint256 amount);
    // event Exercise(address indexed account, uint256 amount);

    // btc relay or oracle
    address public override referee;
    address public override treasury;
    address public override obligation;

    // account balances
    mapping (address => uint256) internal _balances;

    // accounts that can spend an owners funds
    mapping (address => mapping (address => uint256)) internal _allowances;

    // total number of options available
    uint256 public override totalSupply;

    constructor() public Ownable() {}

    /**
    * @notice Initializes the option-side contract with the
    * expected parameters.
    * @param _expiryTime Unix expiry date
    * @param _windowSize Settlement window
    * @param _referee Inclusion verifier
    * @param _treasury Backing currency
    * @param _obligation Obligation ERC20
    **/
    function initialize(
        uint256 _expiryTime,
        uint256 _windowSize,
        address _referee,
        address _treasury,
        address _obligation
    ) external override onlyOwner {
        require(_expiryTime > block.timestamp, ERR_INIT_EXPIRED);
        require(_windowSize > 0, ERR_WINDOW_ZERO);
        expiryTime = _expiryTime;
        windowSize = _windowSize;
        referee = _referee;
        treasury = _treasury;
        obligation = _obligation;
    }

    /**
    * @notice Mints option tokens `from` a writer and transfers them `to` a
    * participant - designed to immediately add liquidity to a pool. This contract
    * will then call the owned Obligation contract to mint the `from` tokens. To 
    * prevent misappropriation of funds we expect this function to be called atomically
    * after depositing in the treasury. The `OptionLib` contract should provide helpers 
    * to facilitate this.
    * @dev Can only be called by the parent factory contract.
    * @dev Once the expiry date has lapsed this function is no longer valid.
    * @param from Origin address
    * @param to Destination address (i.e. uniswap pool)
    * @param amount Total credit
    * @param btcHash Bitcoin hash
    * @param format Bitcoin script format
    **/
    function mint(address from, address to, uint256 amount, bytes20 btcHash, Bitcoin.Script format) external override notExpired {
        // collateral:(options/obligations) are 1:1
        _balances[to] = _balances[to].add(amount);
        totalSupply = totalSupply.add(amount);
        emit Transfer(address(0), to, amount);

        // mint the equivalent obligations
        // obligation is responsible for locking with treasury
        IObligation(obligation).mint(from, amount, btcHash, format);
    }

    function _burn(
        address account,
        uint256 amount
    ) internal {
        _balances[account] = _balances[account].sub(amount);
        totalSupply = totalSupply.sub(amount);
        emit Transfer(account, address(0), amount);
    }

    function requestExercise(address seller, uint amount) external override canExercise {
        // immediately burn options to prevent double spends
        _burn(msg.sender, amount);
        IObligation(obligation).requestExercise(msg.sender, seller, amount);
    }

    /**
    * @notice Exercises an option after `expiryTime` but before `expiryTime + windowSize`. 
    * Requires a transaction inclusion proof which is verified by our chain relay.
    * @dev Can only be called by the parent factory contract.
    * @param seller Account to exercise against
    * @param height Bitcoin block height
    * @param index Bitcoin tx index
    * @param txid Bitcoin transaction id
    * @param proof Bitcoin inclusion proof
    * @param rawtx Bitcoin raw tx
    **/
    function executeExercise(
        address seller,
        uint256 height,
        uint256 index,
        bytes32 txid,
        bytes calldata proof,
        bytes calldata rawtx
    ) external override canExercise {
        address buyer = msg.sender;

        (bytes20 btcHash,) = IObligation(obligation).getBtcAddress(seller);

        // verify & validate tx, use default confirmations
        uint output = IReferee(referee)
            .verifyTx(
                height,
                index,
                txid,
                proof,
                rawtx,
                btcHash
            );

        // burn seller's obligations
        IObligation(obligation).executeExercise(buyer, seller, output);
    }

    /**
    * @notice Refund written collateral after `expiryTime + windowSize`.
    * @dev Can only be called by the parent factory contract.
    * @param amount Amount of collateral
    **/
    function refund(uint amount) external override canRefund {
        // nothing to do here, forward
        IObligation(obligation).refund(msg.sender, amount);
    }

    /// @dev See {IERC20-allowance}
    function allowance(address owner, address spender) external override view returns (uint256) {
        return _allowances[owner][spender];
    }

    /// @dev See {IERC20-approve}
    function approve(address spender, uint256 amount) external override notExpired returns (bool) {
        _approve(msg.sender, spender, amount);
        return true;
    }

    function _approve(address owner, address spender, uint256 amount) internal {
        require(owner != address(0), ERR_APPROVE_FROM_ZERO_ADDRESS);
        require(spender != address(0), ERR_APPROVE_TO_ZERO_ADDRESS);

        _allowances[owner][spender] = amount;
        emit Approval(owner, spender, amount);
    }

    /// @dev See {IERC20-balanceOf}
    function balanceOf(address account) external override view returns (uint256) {
        return _balances[account];
    }

    /// @dev See {IERC20-transfer}
    function transfer(address recipient, uint256 amount) external override notExpired returns (bool) {
        _transfer(msg.sender, recipient, amount);
        return true;
    }

    /// @dev See {IERC20-transferFrom}
    function transferFrom(address sender, address recipient, uint256 amount) external override notExpired returns (bool) {
        _transfer(sender, recipient, amount);
        _approve(sender, msg.sender, _allowances[sender][msg.sender].sub(amount, ERR_TRANSFER_EXCEEDS_BALANCE));
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

        _balances[sender] = _balances[sender].sub(amount, ERR_TRANSFER_EXCEEDS_BALANCE);
        _balances[recipient] = _balances[recipient].add(amount);

        emit Transfer(sender, recipient, amount);
    }

}
