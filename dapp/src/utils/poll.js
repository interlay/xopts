import { STABLE_CONFIRMATIONS } from '../controllers/bitcoin-data';

export function pollAllPendingConfirmations(bitcoin, storage) {
    storage.getPendingOptions().map((option) => {
        return storage.getPendingTransactionsFor(option).map((tx) => {
            pollAndUpdateConfirmations(bitcoin, storage, option, tx.txid);
            return null;
        });
    });
}
  
// Continually checks if a transaction is included and
// updates the number of confirmations
export function pollAndUpdateConfirmations(bitcoin, storage, option, txid) {
    setInterval(async function() {
        try {
            let txStatus = await bitcoin.getStatusTransaction(txid);
            storage.modifyPendingOption(option, txid, "confirmations", txStatus.confirmations);
            // TODO: stop after n retries
            if (txStatus.confirmations >= STABLE_CONFIRMATIONS) clearInterval();
        } catch(error) {}
    }, 30000);
}