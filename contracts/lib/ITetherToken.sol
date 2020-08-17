// SPDX-License-Identifier: Apache-2.0

// https://etherscan.io/address/0xdac17f958d2ee523a2206206994597c13d831ec7#code

pragma solidity ^0.6.0;

interface ITetherToken {
    //  The contract can be initialized with a number of tokens
    //  All the tokens are deposited to the owner address
    //
    // @param _balance Initial supply of the contract
    // @param _name Token Name
    // @param _symbol Token symbol
    // @param _decimals Token decimals
    function TetherToken(
        uint256 _initialSupply,
        string calldata _name,
        string calldata _symbol,
        uint256 _decimals
    ) external;

    // Forward ERC20 methods to upgraded contract if this one is deprecated
    function transfer(address _to, uint256 _value) external;

    // Forward ERC20 methods to upgraded contract if this one is deprecated
    function transferFrom(
        address _from,
        address _to,
        uint256 _value
    ) external;

    // Forward ERC20 methods to upgraded contract if this one is deprecated
    function balanceOf(address who) external view returns (uint256);

    // Forward ERC20 methods to upgraded contract if this one is deprecated
    function approve(address _spender, uint256 _value) external;

    // Forward ERC20 methods to upgraded contract if this one is deprecated
    function allowance(address _owner, address _spender)
        external
        view
        returns (uint256 remaining);

    // deprecate current contract in favour of a new one
    function deprecate(address _upgradedAddress) external;

    // deprecate current contract if favour of a new one
    function totalSupply() external view returns (uint256);

    // Issue a new amount of tokens
    // these tokens are deposited into the owner address
    //
    // @param _amount Number of tokens to be issued
    function issue(uint256 amount) external;

    // Redeem tokens.
    // These tokens are withdrawn from the owner address
    // if the balance must be enough to cover the redeem
    // or the call will fail.
    // @param _amount Number of tokens to be issued
    function redeem(uint256 amount) external;

    function setParams(uint256 newBasisPoints, uint256 newMaxFee) external;

    // Called when new token are issued
    event Issue(uint256 amount);

    // Called when tokens are redeemed
    event Redeem(uint256 amount);

    // Called when contract is deprecated
    event Deprecate(address newAddress);

    // Called if contract ever adds fees
    event Params(uint256 feeBasisPoints, uint256 maxFee);
}
