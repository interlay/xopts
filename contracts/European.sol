// SPDX-License-Identifier: Apache-2.0

pragma solidity ^0.6.0;

import { SafeMath } from "@openzeppelin/contracts/math/SafeMath.sol";

/**
 * @dev Contract module which provides a timed access control mechanism,
 * specifically to model a European Option with an expiry and settlement phase.
 * It must be used through inheritance which provides several modifiers.
 */
contract European {
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
    * @dev Throws if called before the configured timestamp
    */
    modifier hasExpired() {
        // solium-disable-next-line security/no-block-members
        require(block.timestamp > expiryTime, ERR_NOT_EXPIRED);
        _;
    }

    /**
    * @dev Throws if called after the configured timestamp
    */
    modifier notExpired() {
        // solium-disable-next-line security/no-block-members
        require(block.timestamp <= expiryTime, ERR_EXPIRED);
        _;
    }

    /**
    * @dev Throws if called after the exercise window has expired
    */
    modifier canExercise() {
        // solium-disable-next-line security/no-block-members
        require(block.timestamp > expiryTime, ERR_NOT_EXPIRED);
        // solium-disable-next-line security/no-block-members
        require(block.timestamp <= expiryTime.add(windowSize), ERR_EXPIRED);
        _;
    }

    /**
    * @dev Throws if called before the exercise window has expired
    */
    modifier canRefund() {
        // solium-disable-next-line security/no-block-members
        require(block.timestamp > expiryTime.add(windowSize), ERR_NOT_EXPIRED);
        _;
    }
}
