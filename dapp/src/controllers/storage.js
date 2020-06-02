export class Storage {
  // load pending transactions based on user account
  constructor(userAddress) {
    this.userAddress = userAddress;
    this.pendingOptions = this.getPendingOptions();
  }

  // loads an array of pending options
  // a pending option is an object
  // pendingOption = {
  //   amountBtc: number,
  //   recipient: string, // btc address of the recipient/seller
  //   option: string, // the deployed address of the option contract
  //   txid: string, // the id of the btc transaction
  //   confirmations: number, // current number of confirmations
  // }
  getPendingOptions() {
    let pendingOptionsArray = localStorage.getItem(this.userAddress);
    if (pendingOptionsArray != null) {
      let pendingOptions = JSON.parse(pendingOptionsArray);
      return pendingOptions;
    }
    return '';
  }

  // stores an array of pending options
  setPendingOptions(amounBtc, recipient, option, txid, confirmations) {
    let pendingOption = {
      amountBtc: amounBtc,
      recipient: recipient,
      option: option,
      txid: txid,
      confirmations: confirmations
    };
    this.pendingOptions.push(pendingOption);
    let pendingOptionsArray = JSON.stringify(this.pendingOptions);
    localStorage.setItem(this.userAddress, pendingOptionsArray);
  }
  // updates a pending option
  modifyPendingOption(index, key, value) {
    let pendingOption = this.pendingOptions[index];
    for (var k of pendingOption.keys()) {
      if (k === key) {
        pendingOption[k] = value;
        this.getPendingOptions[index] = pendingOption;
        // update in storage
        let pendingOptionsArray = JSON.stringify(this.pendingOptions);
        localStorage.setItem(this.userAddress, pendingOptionsArray);
        return;
      }
    }
  }
}
