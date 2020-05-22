import React, { Component } from "react";
import { Col, Container, Row, Table } from "react-bootstrap";
import LightweightChart from "./LightweightChart";
import { fetchJson } from "ethers/utils";


class Options extends Component {
  
  constructor(props) {
    super(props);
    this.state = {
      optionContracts: ["0x123", "0x"],
      options: []
    };
  }

  componentDidMount() {
    let options = this.getOptions();
  }

  componentDidUpdate() {
    let options = this.getOptions();
  }

  async getOptions() {
    let options = await this.props.optionPoolContract.getOptions();
    console.log(options);
    return options;
  }

  render() {
      return <Container className="p-3">
          <Row>
            <h2>Latest Transactions</h2>
          </Row>
          <Row>
            <Table striped bordered hover>
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Status</th>
                  <th>Total</th>
                  <th>ID</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan="5">Error...</td>
                </tr>
              </tbody>
            </Table>
          </Row>
        </Container>;
  }
}

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
      </div>
    );
  }
}
