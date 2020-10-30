// SPDX-License-Identifier: Apache-2.0

pragma solidity ^0.6.0;

interface IObligation {
    function initialize(
        uint8 _decimals,
        uint256 _expiryTime,
        uint256 _windowSize,
        uint256 _strikePrice,
        address _option,
        address _referee,
        address _treasury,
        address _uniswap
    ) external;

    function getDetails()
        external
        view
        returns (
            uint256 _expiryTime,
            uint256 _windowSize,
            uint256 _strikePrice,
            uint256 _decimals,
            address _collateral,
            address _option
        );

    function option() external returns (address);

    function referee() external returns (address);

    function treasury() external returns (address);

    function obligations(address account) external view returns (uint256);

    function available(address account) external view returns (uint256);

    function mintToPool(address account, uint256 amount) external;

    function mintToWriter(address account, uint256 amount) external;

    function requestExercise(address seller, uint256 satoshis) external;

    function executeExercise(
        bytes32 id,
        uint32 height,
        uint256 index,
        bytes32 txid,
        bytes calldata header,
        bytes calldata proof,
        bytes calldata rawtx
    ) external;

    function withdraw(uint256 amount, address pool) external;
}
