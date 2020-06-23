//
//                       (txId) -> Object
//           (option) ->
//                       (txId) -> Object
// (user) ->
//                       (txId) -> Object
//           (option) ->
//                       (txId) -> Object
//

import { Option, StorageInterface } from '../types/Storage';

export class Storage implements StorageInterface {
  userAddress: string;
  pending: Record<string, Record<string, Option>>;

  // load pending transactions based on user account
  constructor(userAddress: string) {
    this.userAddress = userAddress;
    this.pending = this.loadPendingOptions();
  }

  // loads a tree of pending options
  loadPendingOptions(): Record<string, Record<string, Option>> {
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

  getPendingTransactionsFor(option: string): Array<Option & { txid: string }> {
    let obj = this.pending[option];
    if (!obj) return [];
    return Object.keys(obj).map(function(key) {
      return {
        ...obj[key],
        "txid": key,
      };
    });
  }

  // stores an array of pending options
  setPendingOption(option: string, txId: string, amountBtc: string, recipient: string, optionId: string, confirmations: number) {
    let pendingOption: Option = {
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
  modifyPendingConfirmations(option: string, txid: string, value: number) {
    this.pending[option][txid].confirmations = value;
    // update in storage
    let pendingTree = JSON.stringify(this.pending);
    localStorage.setItem(this.userAddress, pendingTree);      
  }

  removePendingOption(option: string, txId: string) {
    let opt = this.pending[option];
    delete opt[txId];
    this.pending[option] = opt;

    let pendingTree = JSON.stringify(this.pending);
    localStorage.setItem(this.userAddress, pendingTree);
  }

  hasPending() {
    return Object.keys(this.pending).length > 0;
  }

  hasPendingTransactionsFor(option: string) {
    const obj = this.pending[option];
    return obj ? Object.keys(obj).length > 0 : false;
  }
}