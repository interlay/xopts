import React, { Component } from "react";
import { Col, Container, Row, Table } from "react-bootstrap";
import LightweightChart from "./LightweightChart";

export default class Home extends Component {
  render() {
    return (
      <div>
        <section className="jumbotron text-center border-bottom shadow-sm">
          <div className="container">
            <h1>XFLASH</h1>
            <p className="lead text-muted">Amazing one-liner elevator pitch</p>
            <p>
              <a
                href="/borrow"
                className="btn btn-primary m-2"
                style={{ width: "100px" }}
              >
                Borrow
              </a>
              <a
                href="/insure"
                className="btn btn-primary m-2"
                style={{ width: "100px" }}
              >
                Insure
              </a>
              <a
                href="/lend"
                className="btn btn-primary m-2"
                style={{ width: "100px" }}
              >
                Lend
              </a>
            </p>
          </div>
        </section>
        <Container className="p-3">
          <Row>
            <Col>
              <button type="button" className="btn btn-secondary my-4">
                Pool Size <span className="badge badge-light">1209.92 BTC</span>
              </button>
            </Col>
            <Col>
              <button type="button" className="btn btn-secondary my-4">
                Locked <span className="badge badge-light">1209.92 BTC</span>
              </button>
            </Col>
            <Col>
              <button type="button" className="btn btn-secondary my-4">
                Volumn <span className="badge badge-light">109.92 BTC</span>
              </button>
            </Col>
            <Col>
              <button type="button" className="btn btn-secondary my-4">
                Earnings <span className="badge badge-light">10.92 BTC</span>
              </button>
            </Col>
          </Row>
          <Row>
            <Col>
              <LightweightChart />
            </Col>
          </Row>
        </Container>
        <Container className="p-3">
          <Row>
            <h2>Current Transactions</h2>
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
                  <th>2020/10/25</th>
                  <td>
                    <span className="badge badge-pill badge-success">
                      Minted
                    </span>
                  </td>
                  <td>100 BTC</td>
                  <td>
                    6abe96c9ac613da4fa4ef69045f5a792b9d20305e16a8491775710c66183b343
                  </td>
                  <th>
                    <a href="/view" className="badge badge-light">
                      View
                    </a>
                  </th>
                </tr>
                <tr>
                  <th>2020/10/25</th>
                  <td>
                    <span className="badge badge-pill badge-info">
                      Extended
                    </span>
                  </td>
                  <td>100 BTC</td>
                  <td>
                    6abe96c9ac613da4fa4ef69045f5a792b9d20305e16a8491775710c66183b343
                  </td>
                  <th>
                    <a href="/view" className="badge badge-light">
                      View
                    </a>
                  </th>
                </tr>
                <tr>
                  <th>2020/10/25</th>
                  <td>
                    <span className="badge badge-pill badge-danger">
                      Withdrawn
                    </span>
                  </td>
                  <td>100 BTC</td>
                  <td>
                    6abe96c9ac613da4fa4ef69045f5a792b9d20305e16a8491775710c66183b343
                  </td>
                  <th>
                    <a href="/view" className="badge badge-light">
                      View
                    </a>
                  </th>
                </tr>
              </tbody>
            </Table>
          </Row>
        </Container>
      </div>
    );
  }
}
