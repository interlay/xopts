import React, { Component } from "react";
import { Col, Container, Row, Table } from "react-bootstrap";
import LightweightChart from "./LightweightChart";
import { fetchJson } from "ethers/utils";


class LatestTransactions extends Component {
  
  constructor(props) {
    super(props);
    this.state = {
      error: null,
      isLoaded: false,
      transactions: [],
    };
  }

  componentDidMount() {
    fetchJson("http://localhost:8080/latestTxs").then(
      (res) => {
        this.setState({
          isLoaded: true,
          transactions: res,
        });
      },
      (error) => {
        this.setState({
          isLoaded: true,
          error,
        });
      }
    );
  }

  render() {
    const { error, isLoaded, transactions } = this.state;

    console.debug(transactions);
    if (error) {
      return (
        <Container className="p-3">
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
        </Container>
      );
    } else if (!isLoaded) {
      return (
        <Container className="p-3">
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
                  <td colSpan="5">Loading...</td>
                </tr>
              </tbody>
            </Table>
          </Row>
        </Container>
      );
    } else {
      return (
        <Container className="p-3">
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
                {transactions.map((item) => (
                  <tr key={item.id}>
                    <td>{item.timestamp}</td>
                    <td>
                      <span className="badge badge-pill badge-success">
                        {item.status}
                      </span>
                    </td>
                    <td>{item.total}</td>
                    <td>{item.id}</td>
                    <td>
                      <a href="/view" className="badge badge-light">
                        {" "}
                        View
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </Row>
        </Container>
      );
    }
  }
}

class PoolStats extends Component {
  constructor(props) {
    super(props);
    this.state = {
      error: null,
      isLoaded: false,
      stats: [],
    };
  }

  componentDidMount() {
    fetchJson("http://localhost:8080/poolStats").then(
      (res) => {
        this.setState({
          isLoaded: true,
          stats: res,
        });
      },
      (error) => {
        this.setState({
          isLoaded: true,
          error,
        });
      }
    );
  }

  render() {
    const { error, isLoaded, stats } = this.state;
    console.debug("stats=" + stats);
    if (error) {
      return (
        <Container className="p-3">
          <Row>
            <Col>
              <h2>Cannot load pool stats</h2>
            </Col>
          </Row>
          <Row>
            <Col>
              <LightweightChart />
            </Col>
          </Row>
        </Container>
      );
    } else if (!isLoaded) {
      return (
        <Container className="p-3">
          <Row>
            <Col>
              <h2>Loading Pool Stats</h2>
            </Col>
          </Row>
        </Container>
      );
    } else {
      return (
        <Container className="p-3">
          <Row>
            {stats.map((stat) => (
              <Col key={stat.key}>
                <button type="button" className="btn btn-secondary my-4">
                  {stat.key} &nbsp;
                  <span className="badge badge-light">{stat.val}</span>
                </button>
              </Col>
            ))}
          </Row>
          <Row>
            <Col>
              <LightweightChart />
            </Col>
          </Row>
        </Container>
      );
    }
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
        <PoolStats />
        <LatestTransactions />
      </div>
    );
  }
}
