import React, { Component } from "react";
import ReactDOM from "react-dom";
import { BrowserRouter as Router, Switch, Route } from "react-router-dom";
import { ethers } from 'ethers';

// Importing Sass with Bootstrap CSS
import "./App.scss";
import 'bootstrap/dist/css/bootstrap.min.css';

import Dashboard from "./views/Dashboard";
import Home from "./views/Home";
import Topbar from "./components/Topbar";
import Insure from "./views/Insure";
import Underwrite from "./views/Underwrite";
import Buy from "./views/Buy";
import Sell from "./views/Sell";

import optionPoolArtifact from "./artifacts/OptionPool.json"

const optionPoolAddress = "0x5429c8fafa53b09386E41F07CbA2479C170faf0b";

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
        window.ethereum.enable();
        let provider = await new ethers.providers.Web3Provider(web3.currentProvider);

        let optionPoolAbi = optionPoolArtifact.abi;

        let optionPoolContract = await new ethers.Contract(optionPoolAddress, optionPoolAbi, provider);


        this.setState({
          isWeb3: true,
          //signer: signer,
          //address: address,
          provider: provider,
          optionPoolContract: optionPoolContract
        });

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
      console.log(this.state.isLoggedIn);
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
            <Route path="/underwrite">
              <Underwrite />
            </Route>
            <Route path="/buy/:contract"
              render={(props) => <Buy {...props} eth={this.state}/>} />
            <Route path="/sell/:contract"
              render={(props) => <Sell {...props} eth={this.state}/>} />  

            <Route path="/dashboard">
              <Dashboard />
            </Route>
            <Route path="/insure">
              <Insure />
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
