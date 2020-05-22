import React, { Component } from "react";
import ReactDOM from "react-dom";

// Importing Sass with Bootstrap CSS
import "./App.scss";
import 'bootstrap/dist/css/bootstrap.min.css';
import { ethers } from 'ethers';

import { BrowserRouter as Router, Switch, Route } from "react-router-dom";

import Dashboard from "./components/Dashboard";
import Home from "./components/Home";
import Topbar from "./components/Topbar";
import Audit from "./xflash/Audit";
import Insure from "./components/Insure";
import Underwrite from "./components/Underwrite";

import optionPoolArtifact from "./artifacts/OptionPool.json"
import putOptionArtifact from "./artifacts/PutOption.json"

const optionPoolAddress = "0xbe65a1f9a31d5e81d5e2b863aef15bf9b3d92891";

class App extends Component {

  constructor(props) {
    super(props);
    this.state = {
        isWeb3: false,
        signer: null,
        address: null,
        provider: null,
        optionPoolContract: null
    };
  }

  componentDidMount() {
    this.getBlockchainData();
  }


  async getBlockchainData() {
    let web3 = window.web3;
    if (typeof web3 !== 'undefined') {
      let provider = await new ethers.providers.Web3Provider(web3.currentProvider);
      let signer = await provider.getSigner();
      let address = await signer.getAddress();

      let optionPoolAbi = optionPoolArtifact.abi;

      let optionPoolContract = await new ethers.Contract(optionPoolAddress, optionPoolAbi, provider);


      this.setState({
        isWeb3: true,
        signer: signer,
        address: address,
        provider: provider,
        optionPoolContract: optionPoolContract
      });
    }
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
            <Route path="/dashboard">
              <Dashboard />
            </Route>
            <Route path="/audit">
              <Audit />
            </Route>
            <Route path="/insure">
              <Insure />
            </Route>
            <Route exact path="/">
              <Home />
            </Route>
          </Switch>
        </div>
      </Router>
    )
  }
}

ReactDOM.render(<App />, document.getElementById("root"));
