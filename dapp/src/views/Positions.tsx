import React, { Component } from "react";
import { Container, Image } from "react-bootstrap";
import UserPurchasedOptions from "../components/UserPurchasedOptions";
import UserSoldOptions from "../components/UserSoldOptions";
import { Redirect } from "react-router-dom";
import Relay from "../components/Relay";
import bitcoinImg from "../assets/img/icons/32/btc.png";
import daiImg from "../assets/img/icons/32/dai.png";
import {AppProps} from "../types/App";

export default class Dashboard extends Component<AppProps> {

  componentDidMount(){
    this.forceUpdate();
  }
  
  render() {
    if(!this.props.isLoggedIn){
      return <Redirect to="/trade" />
    }
    return (
      <div>
        <section className="jumbotron text-center border-bottom shadow-sm">
          <Container>
            <h2>Your Positions</h2>
            <p className="lead text-muted">Account: {this.props.address} </p>
            <h4> BTC <Image src={bitcoinImg}/> - DAI <Image src={daiImg} /></h4>
            <p className="lead text-muted">(Testnet - Ropsten)</p>
            <a className="nav-link" href="https://www.cryptocompare.com/" target="__blank"> 
              {this.props.btcPrices.dai} BTC/DAI  &nbsp; - &nbsp;
              {this.props.btcPrices.usd} BTC/USD &nbsp; - &nbsp;
              {this.props.daiPrices.usd} DAI/USD
            </a>
            <Relay {...this.props} />
          </Container>
        </section>
        <Container fluid>
          <section>
            <UserPurchasedOptions {...this.props} />
          </section>
          <section className="mt-5 mb-5">
            <UserSoldOptions {...this.props} />
          </section>
        </Container>
      </div>
    );
  }
}