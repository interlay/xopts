import { Container, Row, Table, Col } from "react-bootstrap";
import React, { Component } from "react";

class DashTable extends Component {
  render() {
    return (
      <Container className="p-3">
        <Row>
          <h3 className="py-4">{this.props.heading}</h3>
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
                  <span class="badge badge-pill badge-success">Minted</span>
                </td>
                <td>100 BTC</td>
                <td>
                  6abe96c9ac613da4fa4ef69045f5a792b9d20305e16a8491775710c66183b343
                </td>
                <th>
                  <a href="/view" class="badge badge-info mx-2">
                    View
                  </a>
                </th>
              </tr>
              <tr>
                <th>2020/10/25</th>
                <td>
                  <span class="badge badge-pill badge-info">Extended</span>
                </td>
                <td>100 BTC</td>
                <td>
                  6abe96c9ac613da4fa4ef69045f5a792b9d20305e16a8491775710c66183b343
                </td>
                <th>
                  <a href="/view" class="badge badge-info mx-2">
                    View
                  </a>
                </th>
              </tr>
              <tr>
                <th>2020/10/25</th>
                <td>
                  <span class="badge badge-pill badge-danger">Withdrawn</span>
                </td>
                <td>100 BTC</td>
                <td>
                  6abe96c9ac613da4fa4ef69045f5a792b9d20305e16a8491775710c66183b343
                </td>
                <th>
                  <a href="/view" class="badge badge-info mx-2">
                    View
                  </a>
                  <a href="/view" class="badge badge-success mx-2">
                    Recover
                  </a>
                </th>
              </tr>
              <tr>
                <th>2020/10/25</th>
                <td>
                  <span class="badge badge-pill badge-danger">Withdrawn</span>
                </td>
                <td>100 BTC</td>
                <td>
                  6abe96c9ac613da4fa4ef69045f5a792b9d20305e16a8491775710c66183b343
                </td>
                <th>
                  <a href="/view" class="badge badge-info mx-2">
                    View
                  </a>
                  <a href="/view" class="badge badge-success mx-2">
                    Recover
                  </a>
                </th>
              </tr>
            </tbody>
          </Table>
        </Row>
      </Container>
    );
  }
}

export default class Dashboard extends Component {
  render() {
    return (
      <div>
        <section class="jumbotron text-center border-bottom shadow-sm">
          <div class="container">
            <a
              href="/borrow"
              class="btn btn-primary m-2"
              style={{ width: "100px" }}
            >
              Borrow
            </a>
            <a
              href="/insure"
              class="btn btn-primary m-2"
              style={{ width: "100px" }}
            >
              Insure
            </a>
            <a
              href="/underwrite"
              class="btn btn-primary m-2"
              style={{ width: "100px" }}
            >
              Underwrite
            </a>
            <a
              href="/lend"
              class="btn btn-primary m-2"
              style={{ width: "100px" }}
            >
              Lend
            </a>
          </div>
        </section>
        <Container className="p-3">
          <Row>
            <Col>
              <button type="button" class="btn btn-secondary my-4">
                Total Minted &nbsp;
                <span class="badge badge-light">109.92 BTC</span>
              </button>
            </Col>
            <Col>
              <button type="button" class="btn btn-secondary my-4">
                Total Earnt &nbsp;
                <span class="badge badge-light">10.2 BTC</span>
              </button>
            </Col>
            <Col>
              <button type="button" class="btn btn-secondary my-4">
                Total Return &nbsp;
                <span class="badge badge-light">4.2%</span>
              </button>
            </Col>
          </Row>
        </Container>
        <DashTable heading="Transactions" />
      </div>
    );
  }
}
