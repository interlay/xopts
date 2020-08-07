pragma solidity ^0.6.0;

contract Expirable {

    string constant ERR_INIT_EXPIRED = "Cannot init expired";
    string constant ERR_EXPIRED = "Contract has expired";
    string constant ERR_NOT_EXPIRED = "Contract not expired";

    // expiry timestamp
    uint256 internal _expiry;

    /**
     * @dev Initializes the contract with an expiry time.
     */
    constructor (uint256 expiry) internal {
        require(expiry > block.timestamp, ERR_INIT_EXPIRED);
        _expiry = expiry;
    }

    /**
    * @dev Get the configured expiry.
    */
    function getExpiry() public view returns (uint256) {
        return _expiry;
    }

    /**
    * @dev Throws if called before the configured timestamp.
    */
    modifier hasExpired() {
        require(block.timestamp >= _expiry, ERR_NOT_EXPIRED);
        _;
    }

    /**
    * @dev Throws if called after the configured timestamp.
    */
    modifier notExpired() {
        require(block.timestamp < _expiry, ERR_EXPIRED);
        _;
    }
}
