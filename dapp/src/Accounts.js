import React, { Component } from "react";
import ListGroup from "react-bootstrap/ListGroup";
import Web3 from "web3";

class Accounts extends Component {
  componentDidMount() {
    this.loadBlockchainData();
  }

  async loadBlockchainData() {
    const web3 = new Web3(
      new Web3.providers.HttpProvider("http://localhost:7545")
    );
    const accounts = await web3.eth.getAccounts();
    this.setState({ accounts: accounts });
  }

  constructor(props) {
    super(props);
    this.state = { accounts: [] };
  }

  render() {
    const accs = this.state.accounts.map((x) => <Account address={{ x }} />);
    return <ListGroup>{{ accs }}</ListGroup>;
  }
}

export default Accounts;
