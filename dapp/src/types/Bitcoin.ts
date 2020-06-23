export interface BitcoinInterface {
    getBlockHeight(): Promise<number>;
    getStatusTransaction(txid: string): Promise<{
        confirmed: boolean
        confirmations: number
    }>;
    getRawTransaction(txid: string): Promise<Buffer>;
    getMerkleProof(txid: string): Promise<{
        block_height: number,
        merkle: string[]
        pos: number
    }>;
}