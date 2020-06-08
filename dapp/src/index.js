import React, { Component } from "react";
import ReactDOM from "react-dom";
import { BrowserRouter as Router, Switch, Route } from "react-router-dom";
import { ethers } from 'ethers';
import { toast } from 'react-toastify';

// Importing Sass with Bootstrap CSS
import "./App.scss";
//import 'bootswatch/dist/cerulean/bootstrap.min.css'; // Bootstrap THEME
//import 'bootstrap/dist/css/bootstrap.min.css';
import './assets/css/custom-bootstrap.css';
import 'react-toastify/dist/ReactToastify.css';
import './assets/css/custom.css';

import Dashboard from "./views/Positions";
import Home from "./views/Home";
import LandingPage from "./views/LandingPage";
import Help from "./views/Help";

import Topbar from "./components/Topbar";
import Footer from "./components/Footer";

import { Contracts } from './controllers/contracts';
import { BitcoinQuery } from './controllers/bitcoin-data.js';
import { Storage } from './controllers/storage.js';
import { pollAllPendingConfirmations } from './utils/poll';
import { showFailureToast } from "./controllers/toast";

const INFURA_API_TOKEN = "cffc5fafb168418abcd50a3309eed8be";

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
      storage: null,
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
    this.getWeb3();
    this.getPriceData();
    this.getBitcoinProvider();
    this.getStorageProvider();
  }


  async getWeb3() {
    let web3 = window.web3;
    if (typeof web3 !== 'undefined') {
      this.setState({
        isWeb3: true
      })
    }
    // Check if user is already logged in
    await this.tryLogIn(false);

    if (!this.state.isLoggedIn) {
      // Connect to infura
      let provider = new ethers.providers.InfuraProvider('ropsten', INFURA_API_TOKEN);
      this.setState({
        provider: provider
      });

      if (provider) {
        this.getBlockchainData(provider);
        // Get user account data, if already logged in
      } else {
        console.log("Could not find Web3 provider.");
        showFailureToast(toast, 'Could not fetch blockchain data. Please connect to a wallet (e.g. Metamask), or try again later.', 10000);
      }
    }
  }

  async getBlockchainData(provider) {
    let network = await provider.getNetwork();

    let contracts = null;
    let address = null;
    let signer = null;

    try {
      // Try to get signer (needed to send transactions)
      signer = await provider.getSigner();
      address = await signer.getAddress();
      const { optionPoolAddress, erc20Address } = Contracts.resolve(network);
      contracts = new Contracts(signer, optionPoolAddress, erc20Address);
      let storage = new Storage(address);
      let btcProvider = new BitcoinQuery();
      this.setState({
        isLoggedIn: true,
        signer: signer,
        address: address,
        contracts: contracts,
        storage: storage,
        btcProvider: btcProvider,
      });
      pollAllPendingConfirmations(btcProvider, storage);
    } catch (error) {
      // Otherwise, fetch contracts in read-only mode
      try {
        contracts = new Contracts(provider, "", "");
      } catch(e) {}
      showFailureToast(toast, error.toString(), 3000);
    }
    this.setState({
      isWeb3: true,
      contracts: contracts,
    });

  }

  tryLogIn = async (activeLogin) => {
    let web3 = window.web3;
    if (typeof web3 !== 'undefined') {
      try {
        if (activeLogin) {
          await window.ethereum.enable();
        }
        let provider = await new ethers.providers.Web3Provider(web3.currentProvider);
        //  Check if we indeed have a signer + address => if yes, user is logged in.
        let _signer = provider.getSigner();
        await _signer.getAddress();
        this.setState({
          isLoggedIn: true
        });
        this.getBlockchainData(provider);
      } catch (error) {
        console.log("Not logged in.")
      }
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

  getBitcoinProvider() {
    this.btcProvider = new BitcoinQuery();
  }

  async getStorageProvider(address) {
    this.storage = new Storage(address);
  }

  render() {
    return (
      <Router>
        <Topbar {...this.state} tryLogIn={this.tryLogIn} />
        <Switch>
          <Route exact path="/">
            <LandingPage />
          </Route>

          <Route path="/help">
            <Help />
          </Route>
          
          <Route path="/positions">
            <Dashboard {...this.state} />
          </Route>

          <Route path="/trade" render={() => <Home {...this.state} tryLogIn={this.tryLogIn} />} />
        </Switch>
        <Footer />
      </Router>
    )
  }
}

ReactDOM.render(<App />, document.getElementById("root"));
