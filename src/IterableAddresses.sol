pragma solidity ^0.6.0;

import "@openzeppelin/contracts/math/SafeMath.sol";

library IterableAddresses {
    using SafeMath for uint;

    struct List {
        address[] keys;
        mapping(address => uint) indexOf;
        mapping(address => bool) inserted;
    }

    function exists(List storage list, address key) internal view returns (bool) {
        return list.inserted[key];
    }

    function getKeyAtIndex(List storage list, uint index) internal view returns (address) {
        return list.keys[index];
    }

    function size(List storage list) internal view returns (uint) {
        return list.keys.length;
    }

    function set(List storage list, address key) internal {
        if (!list.inserted[key]) {
            list.inserted[key] = true;
            list.indexOf[key] = list.keys.length;
            list.keys.push(key);
        }
    }

    function remove(List storage list, address key) internal {
        if (!list.inserted[key]) {
            return;
        }

        delete list.inserted[key];

        uint index = list.indexOf[key];
        uint lastIndex = list.keys.length - 1;
        address lastKey = list.keys[lastIndex];

        list.indexOf[lastKey] = index;
        delete list.indexOf[key];

        list.keys[index] = lastKey;
        list.keys.pop();
    }
}