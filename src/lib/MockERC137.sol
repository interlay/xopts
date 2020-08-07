pragma solidity ^0.6.0;

import "./IERC137.sol";

contract ERC137Registry is IERC137Registry {
    mapping(bytes32 => address) _resolvers;

    function setResolver(bytes32 node, address value) external override {
        _resolvers[node] = value;
    }

    function resolver(bytes32 node) external override returns (address) {
        return _resolvers[node];
    }
}

contract ERC137Resolver is IERC165, IERC137Resolver {
    address _value;

    constructor(address value) public {
        _value = value;
    }

    function supportsInterface(bytes4 interfaceID) external override view returns (bool) {
        return interfaceID == 0x3b3b57de;
    }

    function addr(bytes32 node) external override view returns (address) {
        return _value;
    }
}