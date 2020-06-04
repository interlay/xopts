export class Storage {
  // load pending transactions based on user account
  constructor(userAddress) {
    this.userAddress = userAddress;
    this.pendingOptions = this.getPendingOptions();
  }

  clearPendingOptions() {
    localStorage.clear()
  }

  // loads an array of pending options
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
  getPendingOptions() {
    let pendingOptionsArray = localStorage.getItem(this.userAddress);
    if (pendingOptionsArray != null) {
      let pendingOptions = JSON.parse(pendingOptionsArray);
      return pendingOptions;
    }
    return [];
  }

  getPendingOptionsAsMap() {
    return this.pendingOptions.reduce(function(map, obj) {
      map[obj.recipient] = obj;
      return map;
    }, {});
  }

  getPendingOptionsForOption(option) {
    return this.pendingOptions.filter((opt) => {
      return opt.option === option;
    });
  }

  getPendingOptionsWithoutTxId() {
    let pendingOptions = this.getPendingOptions();
    let pendingOptionsWithoutTxId = [];
    for (var option of pendingOptions) {
      if (option.txid) {
        pendingOptionsWithoutTxId.push(option);
      }
    }
    return pendingOptionsWithoutTxId;
  }

  getPendingOptionsWithTxId() {
    let pendingOptions = this.getPendingOptions();
    let pendingOptionsWithTxId = [];
    for (var option of pendingOptions) {
      if (option.txid) {
        pendingOptionsWithTxId.push(option);
      }
    }
    return pendingOptionsWithTxId;
  }

  getMatchingTxId(amountBtc, recipient, optionAddress) {
    let pendingOptionsWithTxId = this.getPendingOptionsWithTxId();
    for (var option of pendingOptionsWithTxId) {
      if (
        option.amountBtc === amountBtc
        && option.option === optionAddress
        && option.recipient === recipient
      ) {
        return option.txid;
      }
    }
    return "";
  }

  // stores an array of pending options
  setPendingOptions(amountBtc, recipient, option, optionId, txid, confirmations) {
    let pendingOption = {
      amountBtc: amountBtc,
      recipient: recipient,
      option: option,
      optionId: optionId,
      txid: txid,
      confirmations: confirmations,
      pending: true,
    };
    this.pendingOptions.push(pendingOption);
    let pendingOptionsArray = JSON.stringify(this.pendingOptions);
    localStorage.setItem(this.userAddress, pendingOptionsArray);
  }

  // updates a pending option
  modifyPendingOption(index, key, value) {
    let pendingOption = this.pendingOptions[index];
    pendingOption[key] = value;
    this.getPendingOptions[index] = pendingOption;
    // update in storage
    let pendingOptionsArray = JSON.stringify(this.pendingOptions);
    localStorage.setItem(this.userAddress, pendingOptionsArray);      
  }

  modifyPendingOptionsWithTxID(txid, key, value) {
    let pendingOptions = this.getPendingOptions();
    pendingOptions.map((option, index) => {
      if (option.txid === txid) {
        this.modifyPendingOption(index, key, value);
      }
      return null;
    })
  }

  removePendingOption(index) {
    this.pendingOptions.splice(index, 1);
    let pendingOptionsArray = JSON.stringify(this.pendingOptions);
    localStorage.setItem(this.userAddress, pendingOptionsArray);
  }

  hasPendingOptions() {
    return this.pendingOptions.length > 0;
  }
}
