// SPDX-License-Identifier: Apache-2.0

pragma solidity ^0.6.0;

/// @dev Bitcoin specific types to facilitate settlement
library Bitcoin {
    enum Script {
        p2sh,
        p2pkh,
        p2wpkh
    }

    struct Address {
        bytes20 btcHash;
        Script format;
    }
}