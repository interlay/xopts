import React, { Component } from "react";
import { Image, Container} from "react-bootstrap";
import OptionList from "../components/OptionList"
import { withRouter } from 'react-router-dom'
import bitcoinImg from "../assets/img/icons/32/btc.png";
import daiImg from "../assets/img/icons/32/dai.png";
import {AppProps} from "../types/App";

export default class Home extends Component<AppProps> {
  
  componentDidMount(){
    this.forceUpdate();
  }

  render() {
    return (
      <div>
        <section className="jumbotron text-center border-bottom shadow-sm">
        <Container>
            <h2>Buy and Sell Put Options</h2>
            <p className="lead text-muted">Available Markets:</p>
            <h4> BTC <Image src={bitcoinImg}/> - DAI <Image src={daiImg} /></h4>
            <p className="lead text-muted">(Testnet - Ropsten)</p>
            <a className="nav-link prices" href="https://www.cryptocompare.com/" target="__blank"> 
              {this.props.btcPrices.dai} BTC/DAI  &nbsp; - &nbsp;
              {this.props.btcPrices.usd} BTC/USD &nbsp; - &nbsp;
              {this.props.daiPrices.usd} DAI/USD
            </a>
          </Container>
        </section>
        
        <Container fluid>
          <section className="mb-5">
            <OptionList {...this.props} />
          </section>
        </Container>

      </div>
    );
  }
}