import React, { Component } from "react";
import Web3 from "web3";;

class Account extends Component {
  componentDidMount() {
    this.loadBlockchainData();
  }

  async send(amount) {
    const web3 = new Web3(
      new Web3.providers.HttpProvider("http://localhost:7545")
    );
    const sender = this.state.account;
    const receiver = "0xaA1d26F6fc4633BBa09Bd718Ac15Ab01904488Da";
    web3.sendTransaction({
      to: receiver,
      from: sender,
      value: web3.toWei("1.0", "ether"),
    });
  }

  async loadBlockchainData() {
    const web3 = new Web3(
      new Web3.providers.HttpProvider("http://localhost:7545")
    );
    const accounts = await web3.eth.getAccounts();
    const account = accounts[0];
    console.debug(accounts);
    web3.eth
      .getBalance(account)
      .then((x) => {
          console.log(x);
          this.setState({ account: account, balance: x });
        });
  }

  constructor(props) {
    super(props);
    this.state = { account: "empty", balance: "0" };
  }

  render() {
    return (
      <div className="container">
        <p>
          <b>Your account</b>: {this.state.account}
        </p>
        <p>
          <b>Your balance</b>: {this.state.balance}
        </p>
      </div>
    );
  }
}

export default Account;