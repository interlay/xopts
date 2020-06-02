import React, { Component } from "react";
import { Col, Container, Row, Table } from "react-bootstrap";
import { fetchJson } from "ethers/utils";
import OptionList from "../components/OptionList.js"
import { withRouter } from 'react-router-dom'

class LandingPage extends Component {
  
  render() {
    return (
      <div>
        <section className="jumbotron text-center border-bottom shadow-sm">
          <div className="container">
            <h1>Trustless Bitcoin-Native Options</h1>
            <p className="lead text-muted">Buy and Sell Insurance against Bitcoin Price Fluctuations. </p>

          </div>
        </section>
      </div>
    );
  }
}

export default withRouter(LandingPage);
