import React, { Component } from "react";
import ReactDOM from "react-dom";
import { BrowserRouter as Router, Switch, Route } from "react-router-dom";
import { ethers } from 'ethers';
import { withRouter } from 'react-router-dom'

// Importing Sass with Bootstrap CSS
import "./App.scss";
//import 'bootswatch/dist/cerulean/bootstrap.min.css'; // Bootstrap THEME
//import 'bootstrap/dist/css/bootstrap.min.css';
import './assets/css/custom-bootstrap.css';
import 'react-toastify/dist/ReactToastify.css';

import Dashboard from "./views/Dashboard";
import Home from "./views/Home";
import Topbar from "./components/Topbar";

import { Contracts } from './controllers/contracts';
import { BitcoinQuery } from './controllers/bitcoin-data.js';

class App extends Component {

  constructor(props) {
    super(props);
    this.state = {
      isWeb3: false,
      isLoggedIn: false,
      signer: null,
      address: null,
      provider: null,
      btcProvider: null,
      contracts: null,
      btcPrices: {
        dai: null,
        usd: null,
        eth: null
      },
      optionPoolContract: null,
      daiPrices: {
        usd: null,
        eth: null
      }
    };
  }

  componentDidMount() {
    this.getBlockchainData();
    this.getPriceData();
    this.getBitcoinProvider();
  }

  async getBlockchainData() {
    let web3 = window.web3;
    if (typeof web3 !== 'undefined') {
      try {
        // get Ethereum smart contract details
        let provider = new ethers.providers.Web3Provider(web3.currentProvider);

        this.setState({
          isWeb3: true,
          provider: provider,
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
      let network = await provider.getNetwork();
      let contracts = new Contracts(signer, network);

      this.setState({
        isLoggedIn: true,
        signer: signer,
        address: address,
        contracts: contracts,
      });
    } catch (error) {
      console.log("Not logged in.")
    }
  }

  async getPriceData() {
    fetch("https://min-api.cryptocompare.com/data/pricemulti?fsyms=BTC,DAI&tsyms=DAI,USD,ETH&api_key=0fe74ac7dd16554406f7ec8d305807596571e13bd6b3c8ac496ac436c17c26e2").then(res => res.json())
      .then(
        (result) => {
          this.setState({
            btcPrices: {
              dai: result.BTC.DAI,
              usd: result.BTC.USD,
              eth: result.BTC.ETH
            },
            daiPrices: {
              usd: result.DAI.USD,
              eth: result.DAI.ETH
            }
          })
        }
      )
  }

  async getBitcoinProvider() {
    this.btcProvider = new BitcoinQuery();
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
