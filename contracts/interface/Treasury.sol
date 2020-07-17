pragma solidity ^0.5.15;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/GSN/Context.sol";
import "@openzeppelin/contracts/ownership/Ownable.sol";

interface ITreasury {
    function lock(address account, uint amount) external;
}
