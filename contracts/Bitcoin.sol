pragma solidity ^0.5.15;

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