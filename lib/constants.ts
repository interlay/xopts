export enum Script {
    p2sh,
    p2pkh,
    p2wpkh
}

export const ErrorCode = {
    ERR_INSUFFICIENT_COLLATERAL: "Insufficient collateral",
    ERR_INSUFFICIENT_UNLOCKED: "Insufficient unlocked",
    ERR_INSUFFICIENT_BALANCE: "Insufficient balance",
    ERR_ZERO_PREMIUM: "Requires non-zero premium",
    ERR_ZERO_STRIKE_PRICE: "Requires non-zero strike price",
    ERR_ZERO_AMOUNT: "Requires non-zero amount",
    ERR_INIT_EXPIRED: "Cannot init expired",
    ERR_EXPIRED: "Contract has expired",
    ERR_NOT_EXPIRED: "Contract not expired",
    ERR_NO_BTC_ADDRESS: "Insurer lacks BTC address",
    ERR_UNEXPECTED_BTC_ADDRESS: "Cannot change BTC address",
    ERR_VERIFY_TX: "Cannot verify tx inclusion",
    ERR_VALIDATE_TX: "Cannot validate tx format",
    ERR_TRANSFER_EXCEEDS_BALANCE: "ERC20: transfer amount exceeds balance",
    ERR_APPROVE_TO_ZERO_ADDRESS: "ERC20: approve to the zero address",
    ERR_TRANSFER_TO_ZERO_ADDRESS: "ERC20: transfer to the zero address",
    ERR_APPROVE_FROM_ZERO_ADDRESS: "ERC20: approve from the zero address",
    ERR_TRANSFER_FROM_ZERO_ADDRESS: "ERC20: transfer from the zero address",
    ERR_INVALID_AMOUNT: "Invalid amount",

    ERR_INVALID_OUT_HASH: "Invalid output hash",
    ERR_INVALID_OUT_AMOUNT: "Invalid output amount",
}