import React, { Component } from "react";
import { Col, Container, Row, Table } from "react-bootstrap";
import { fetchJson } from "ethers/utils";
import OptionList from "../components/OptionList.js"

export default class Home extends Component {
  render() {
    return (
      <div>
        <section className="jumbotron text-center border-bottom shadow-sm">
          <div className="container">
            <h1>Decentralized Bitcoin Options</h1>
            <p className="lead text-muted">Buy and Sell Protection against Bitcoin Price Drops. </p>
            <p>
              <a
                href="/insure"
                className="btn btn-primary m-2"
                style={{ width: "100px" }}
              >
                Insure
              </a>
              <a
                href="/underwrite"
                className="btn btn-primary m-2"
                style={{ width: "100px" }}
              >
                Underwrite
              </a>
            </p>
          </div>
        </section>
        <OptionList {...this.props}/>
      </div>
    );
  }
}
