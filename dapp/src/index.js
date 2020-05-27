import React, { Component } from "react";
import ReactDOM from "react-dom";
import { BrowserRouter as Router, Switch, Route } from "react-router-dom";
import { ethers } from 'ethers';
import { withRouter } from 'react-router-dom'

// Importing Sass with Bootstrap CSS
import "./App.scss";
import 'bootstrap/dist/css/bootstrap.min.css';
import 'react-toastify/dist/ReactToastify.css';

import Dashboard from "./views/Dashboard";
import Home from "./views/Home";
import Topbar from "./components/Topbar";

import optionPoolArtifact from "./artifacts/OptionPool.json"


class App extends Component {

  constructor(props) {
    super(props);
    this.state = {
      isWeb3: false,
      isLoggedIn: false,
      signer: null,
      address: null,
      provider: null,
      optionPoolContract: null,
      btcPrices: {
        dai: null,
        usd: null,
        eth: null
      }
    };
  }

  componentDidMount() {
    this.getBlockchainData();
    this.getPriceData();
  }

  async getBlockchainData() {
    let web3 = window.web3;
    if (typeof web3 !== 'undefined') {
      try {
        // get Ethereum smart contract details
        let provider = new ethers.providers.Web3Provider(web3.currentProvider);

        let optionPoolAddress = "0x3E99d12ACe8f4323DCf0f61713788D2d3649b599";
        let erc20Address = "0x151eA753f0aF1634B90e1658054C247eFF1C2464";        

        let network = await provider.getNetwork();
        if (network.name === "ropsten") {
          optionPoolAddress = "0x2900a6b10d83C4Be83CBd80784a34D8ba4A1D99D";
          erc20Address = "0x117054F477B40128A290a0d48Eb8aF6e12F333ce";
        }

        let optionPoolContract = new ethers.Contract(optionPoolAddress, optionPoolArtifact.abi, provider);

        this.setState({
          isWeb3: true,
          provider: provider,
          optionPoolContract: optionPoolContract,
          erc20Address: erc20Address
        });

        // Get user account data, if already logged in
        this.tryLogIn(provider);
      } catch (error) {
        console.log(error);
      }
    }
  }

  async tryLogIn(provider) {
    try {
      let signer = await provider.getSigner();
      let address = await signer.getAddress();
      this.setState({
        isLoggedIn: true,
        signer: signer,
        address: address,
      });
    } catch (error) {
      console.log("Not logged in.")
    }
  }

  async getPriceData() {
    fetch("https://min-api.cryptocompare.com/data/pricemulti?fsyms=BTC&tsyms=DAI,USD,ETH&api_key=0fe74ac7dd16554406f7ec8d305807596571e13bd6b3c8ac496ac436c17c26e2").then(res => res.json())
      .then(
        (result) => {
          this.setState({
            btcPrices: {
              dai: result.BTC.DAI,
              usd: result.BTC.USD,
              eth: result.BTC.ETH
            }
          })
        }
      )
  }


  render() {
    return (
      <Router>
        <div>
          <Topbar {...this.state} />
          <Switch>
            <Route path="/dashboard">
              <Dashboard {...this.state}/>
            </Route>

            <Route path="/">
              <Home {...this.state} />
            </Route>
          </Switch>
        </div>
      </Router>
    )
  }
}


ReactDOM.render(<App />, document.getElementById("root"));
