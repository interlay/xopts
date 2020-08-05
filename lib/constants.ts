export enum Script {
    p2sh,
    p2pkh,
    p2wpkh
}

export const ErrorCode = {
    // ERC20
    ERR_TRANSFER_EXCEEDS_BALANCE: "Amount exceeds balance",
    ERR_APPROVE_TO_ZERO_ADDRESS: "Approve to zero address",
    ERR_TRANSFER_TO_ZERO_ADDRESS: "Transfer to zero address",
    ERR_APPROVE_FROM_ZERO_ADDRESS: "Approve from zero address",
    ERR_TRANSFER_FROM_ZERO_ADDRESS: "Transfer from zero address",

    // Expirable
    ERR_INIT_EXPIRED: "Cannot init expired",
    ERR_EXPIRED: "Contract has expired",
    ERR_NOT_EXPIRED: "Contract not expired",
    ERR_WINDOW_ZERO: "Window cannot be zero",

    // Obligation
    ERR_INVALID_OUTPUT_AMOUNT: "Invalid output amount",
    ERR_NO_BTC_ADDRESS: "Insurer lacks BTC address",
    ERR_INSUFFICIENT_OBLIGATIONS: "Seller has insufficient obligations",
    ERR_INVALID_SECRET: "Buyer has encoded an incorrect secret",
    ERR_SUB_WITHDRAW_BALANCE: "Insufficient pool balance",
    ERR_SUB_WITHDRAW_AVAILABLE: "Insufficient available",
    ERR_ZERO_STRIKE_PRICE: "Requires non-zero strike price",

    // OptionPairFactory
    ERR_INVALID_OPTION: "Option does not exist",
    ERR_ZERO_AMOUNT: "Requires non-zero amount",
    // ERR_NO_BTC_ADDRESS: "Insurer lacks BTC address",

    // Treasury
    ERR_INSUFFICIENT_DEPOSIT: "Insufficient deposit amount",
    ERR_INSUFFICIENT_LOCKED: "Insufficient collateral locked",
    ERR_INSUFFICIENT_UNLOCKED: "Insufficient collateral unlocked",

    // BTCReferee
    ERR_INVALID_OUT_HASH: "Invalid output hash",
    ERR_TX_NOT_INCLUDED: "Cannot verify tx inclusion",
}