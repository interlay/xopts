pragma solidity ^0.6.6;

import "@nomiclabs/buidler/console.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract Treasury is ERC20("XCLAIM(BTC,ETH)", "EthBTC") {}
