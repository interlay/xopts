export type Option = {
    amountBtc: string
    // btc address of the recipient/seller
    recipient: string
    // the ticker id of the option contract
    optionId: string
    // current number of confirmations
    confirmations: number
    // has this option been exercised
    pending: boolean
}
  
export interface StorageInterface {
    loadPendingOptions(): Record<string, Record<string, Option>>;
    getPendingOptions(): string[];
    getPendingTransactionsFor(option: string): Array<Option & { txid: string }>;
    setPendingOption(option: string, txId: string, amountBtc: string, recipient: string, optionId: string, confirmations: number): void;
    modifyPendingConfirmations(option: string, txid: string, value: number): void;
    removePendingOption(option: string, txId: string): void;
    hasPending(): boolean;
    hasPendingTransactionsFor(option: string): boolean;
}