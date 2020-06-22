import { STABLE_CONFIRMATIONS } from '../controllers/bitcoin-data';
import { StorageInterface } from '../types/Storage';
import { BitcoinInterface } from '../types/Bitcoin';

export function pollAllPendingConfirmations(bitcoin: BitcoinInterface, storage: StorageInterface) {
    storage.getPendingOptions().map((option) => {
        return storage.getPendingTransactionsFor(option).map((tx) => {
            pollAndUpdateConfirmations(bitcoin, storage, option, tx.txid);
            return null;
        });
    });
}
  
// Continually checks if a transaction is included and
// updates the number of confirmations
export function pollAndUpdateConfirmations(bitcoin: BitcoinInterface, storage: StorageInterface, option: string, txid: string) {
    setInterval(async function() {
        try {
            let txStatus = await bitcoin.getStatusTransaction(txid);
            storage.modifyPendingConfirmations(option, txid, txStatus.confirmations);
            // TODO: stop after n retries
            if (txStatus.confirmations >= STABLE_CONFIRMATIONS) clearInterval();
        } catch(error) {}
    }, 30000);
}