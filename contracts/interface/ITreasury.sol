pragma solidity ^0.5.15;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/GSN/Context.sol";
import "@openzeppelin/contracts/ownership/Ownable.sol";


/// @title An interface for a treasury contract per ERC20
/// @author Interlay
/// @notice This interface manages locking and unlocking of collateral.
interface ITreasury {

    function collateral() external returns (address);

    function balanceUnlocked(address market, address account) external view returns (uint);

    function balanceLocked(address market, address account) external view returns (uint);

    function deposit(address market, address account, uint amount) external;

    function withdraw(address market, uint amount) external;

    function lock(address account, uint amount) external;

    function unlock(address account, uint amount) external;

    function release(address from, address to, uint amount) external;

}
