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