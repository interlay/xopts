import React, { Component } from "react";
import { Container, Row, Table } from "react-bootstrap";

class AuditTable extends Component {
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
                <th>Total</th>
                <th>ID</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th>2020/10/25</th>
                <td>100 BTC</td>
                <td>
                  6abe96c9ac613da4fa4ef69045f5a792b9d20305e16a8491775710c66183b343
                </td>
                <th>
                  <a href="/view" class="badge badge-light">
                    View
                  </a>
                </th>
              </tr>
              <tr>
                <th>2020/10/25</th>
                <td>100 BTC</td>
                <td>
                  6abe96c9ac613da4fa4ef69045f5a792b9d20305e16a8491775710c66183b343
                </td>
                <th>
                  <a href="/view" class="badge badge-light">
                    View
                  </a>
                </th>
              </tr>
              <tr>
                <th>2020/10/25</th>
                <td>100 BTC</td>
                <td>
                  6abe96c9ac613da4fa4ef69045f5a792b9d20305e16a8491775710c66183b343
                </td>
                <th>
                  <a href="/view" class="badge badge-light">
                    View
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

export default class Audit extends Component {
  render() {
    return (
      <div>
        <section class="jumbotron text-center border-bottom shadow-sm">
          <div class="container">
            <h1>Audit</h1>
            <p class="lead text-muted">Transparent. Auditable. Verifiable.</p>
          </div>
        </section>
        <AuditTable heading="Lending Pool" />
        <AuditTable heading="Proof of Coins Transactions" />
        <AuditTable heading="Insured Coins Transactions" />
        <AuditTable heading="Underwritten Transactions" />
      </div>
    );
  }
}
