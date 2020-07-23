pragma solidity ^0.5.15;

import { SafeMath } from "@openzeppelin/contracts/math/SafeMath.sol";

/**
 * @dev Contract module which provides a timed access control mechanism,
 * specifically to model a European Option with an expiry and settlement phase.
 * It must be used through inheritance which provides several modifiers.
 */
contract Expirable {
    using SafeMath for uint;

    string constant ERR_INIT_EXPIRED = "Cannot init expired";
    string constant ERR_EXPIRED = "Contract has expired";
    string constant ERR_NOT_EXPIRED = "Contract not expired";
    string constant ERR_WINDOW_ZERO = "Window cannot be zero";

    // expiry timestamp
    uint256 public expiryTime;

    // window post expiry
    uint256 public windowSize;

    /**
     * @dev Initializes the contract with an expiry time and exercise window
     * @param _expiryTime Unix time for expiry
     * @param _windowSize Non-zero window for exercises post-expiry
     */
    constructor (uint _expiryTime, uint _windowSize) internal {
        require(_expiryTime > block.timestamp, ERR_INIT_EXPIRED);
        require(_windowSize > 0, ERR_WINDOW_ZERO);
        expiryTime = _expiryTime;
        windowSize = _windowSize;
    }

    /**
    * @dev Throws if called before the configured timestamp
    */
    modifier hasExpired() {
        require(block.timestamp > expiryTime, ERR_NOT_EXPIRED);
        _;
    }

    /**
    * @dev Throws if called after the configured timestamp
    */
    modifier notExpired() {
        require(block.timestamp <= expiryTime, ERR_EXPIRED);
        _;
    }

    /**
    * @dev Throws if called after the exercise window has expired
    */
    modifier canExercise() {
        require(block.timestamp > expiryTime, ERR_NOT_EXPIRED);
        require(block.timestamp <= expiryTime.add(windowSize), ERR_EXPIRED);
        _;
    }

    /**
    * @dev Throws if called before the exercise window has expired
    */
    modifier canRefund() {
        require( block.timestamp > expiryTime.add(windowSize), ERR_NOT_EXPIRED);
        _;
    }
}
