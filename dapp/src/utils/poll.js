import { STABLE_CONFIRMATIONS } from '../controllers/bitcoin-data';

export function pollPendingConfirmations(bitcoin, storage) {
    storage.getPendingOptions().map((option, _) => {
        pollAndUpdateConfirmations(bitcoin, storage, option.txid);
        return null;
    });
}
  
// Continually checks if a transaction is included and
// updates the number of confirmations
export function pollAndUpdateConfirmations(bitcoin, storage, txid) {
    setInterval(async function() {
        try {
            let txStatus = await bitcoin.getStatusTransaction(txid);
            storage.modifyPendingOptionsWithTxID(txid, "confirmations", txStatus.confirmations);
            // TODO: stop after n retries
            if (txStatus.confirmations >= STABLE_CONFIRMATIONS) clearInterval();
        } catch(error) {}
    }, 30000);
}