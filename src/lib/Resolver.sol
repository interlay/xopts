pragma solidity ^0.5.15;

interface IERC165 {
    function supportsInterface(bytes4 interfaceID) external view returns (bool);
}

interface IERC137Registry {
    function resolver(bytes32 node) external returns (address);
    function setResolver(bytes32 node, address value) external;
}

contract IERC137Resolver is IERC165 {
    function addr(bytes32 node) external view returns (address);
}

contract ERC137Registry is IERC137Registry {
    mapping(bytes32 => address) _resolvers;

    function setResolver(bytes32 node, address value) external {
        _resolvers[node] = value;
    }

    function resolver(bytes32 node) external returns (address) {
        return _resolvers[node];
    }
}

contract ERC137Resolver is IERC137Resolver {
    address _value;

    constructor(address value) public {
        _value = value;
    }

    function supportsInterface(bytes4 interfaceID) external view returns (bool) {
        return interfaceID == 0x3b3b57de;
    }

    function addr(bytes32 node) external view returns (address) {
        return _value;
    }
}