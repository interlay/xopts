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
    ERR_INVALID_EXERCISE_AMOUNT: "Invalid exercise amount",
    ERR_NO_BTC_ADDRESS: "Insurer lacks BTC address",

    // Option
    ERR_VALIDATE_TX: "Cannot validate tx",
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
    ERR_INVALID_OUT_AMOUNT: "Invalid output amount",
    ERR_VERIFY_TX: "Cannot verify tx inclusion",
}