//
//                       (txId) -> Object
//           (option) ->
//                       (txId) -> Object
// (user) ->
//                       (txId) -> Object
//           (option) ->
//                       (txId) -> Object
//
export class Storage {
  // load pending transactions based on user account
  constructor(userAddress) {
    this.userAddress = userAddress;
    this.pending = this.loadPendingOptions();
  }

  // loads a tree of pending options
  // a pending option is an object
  // pendingOption = {
  //   amountBtc: number,
  //   recipient: string, // btc address of the recipient/seller
  //   option: string, // the deployed address of the option contract
  //   optionId: string, // the ticker id of the option contract
  //   txid: string, // the id of the btc transaction
  //   confirmations: number, // current number of confirmations
  //   pending: bool, // has this option been exercised
  // }
  loadPendingOptions() {
    let pendingTree = localStorage.getItem(this.userAddress);
    if (pendingTree != null) {
      let pending = JSON.parse(pendingTree);
      return pending;
    }
    return {};
  }

  getPendingOptions() {
    const obj = this.pending;
    return obj ? Object.keys(obj) : [];
  }

  getPendingTransactionsFor(option) {
    let obj = this.pending[option];
    if (!obj) return [];
    return Object.keys(obj).map(function(key) {
      return {
        "txid": key,
        ...obj[key]
      };
    });
  }

  // stores an array of pending options
  setPendingOption(option, txId, amountBtc, recipient, optionId, confirmations) {
    let pendingOption = {
      amountBtc: amountBtc,
      recipient: recipient,
      optionId: optionId,
      confirmations: confirmations,
      pending: true,
    };
    if (this.pending[option] == null) this.pending[option] = {};
    this.pending[option][txId] = pendingOption;
    let pendingTree = JSON.stringify(this.pending);
    localStorage.setItem(this.userAddress, pendingTree);
  }

  // updates a pending option
  modifyPendingOption(option, txid, key, value) {
    this.pending[option][txid][key] = value
    // update in storage
    let pendingTree = JSON.stringify(this.pending);
    localStorage.setItem(this.userAddress, pendingTree);      
  }

  removePendingOption(option, txId) {
    let opt = this.pending[option];
    delete opt[txId];
    this.pending[option] = opt;

    let pendingTree = JSON.stringify(this.pending);
    localStorage.setItem(this.userAddress, pendingTree);
  }

  hasPending() {
    return Object.keys(this.pending).length > 0;
  }

  hasPendingTransactionsFor(option) {
    const obj = this.pending[option];
    return obj ? Object.keys(obj).length > 0 : false;
  }
}