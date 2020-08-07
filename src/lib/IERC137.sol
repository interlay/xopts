pragma solidity ^0.6.0;

interface IERC165 {
    function supportsInterface(bytes4 interfaceID) external view returns (bool);
}

interface IERC137Registry {
    function resolver(bytes32 node) external returns (address);
    function setResolver(bytes32 node, address value) external;
}

interface IERC137Resolver {
    function addr(bytes32 node) external view returns (address);
}