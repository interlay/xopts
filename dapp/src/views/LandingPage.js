import React, { Component } from "react";
import { Image } from "react-bootstrap";
import { fetchJson } from "ethers/utils";
import OptionList from "../components/OptionList.js"
import { withRouter, NavLink } from 'react-router-dom'
import xoptsLogo from "../assets/img/xopts-logo.svg";

class LandingPage extends Component {
  
  render() {
    return (
      <div>
        <section className="jumbotron text-center white-background">
          <div className="container">
            <h1>Non-Custodial Bitcoin Options</h1>
            <h3 className="lead text-muted">Buy and Sell Insurance against Bitcoin Price Fluctuations. </h3>
            <h3 className="lead text-muted">Keep Control Over You Coins.</h3>
            <NavLink to="/market">Market</NavLink>
          </div>
        </section>
      </div>
    );
  }
}

export default withRouter(LandingPage);
