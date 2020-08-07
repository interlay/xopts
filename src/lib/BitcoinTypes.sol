pragma solidity ^0.6.0;

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