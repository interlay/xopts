
Bitcoin Transaction Format
---------------------------



::
    OP_DUP
    OP_HASH <pubkey_hash_ALICE>
    OP_EQUALVERIFY
    OP_CHECKSIG
    <lender_pubkey> OP_CHECKSIG OP_NOTIF
        <lender_pubkey> OP_CHECKSIGVERIFY OP_SIZE <20> OP_EQUALVERIFY OP_HASH256 <H> OP_EQUAL
    OP_ELSE
        <e803> OP_CHECKSEQUENCEVERIFY
    OP_ENDIF
