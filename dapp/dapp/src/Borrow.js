import { Container, Row, Table, Col, Form } from "react-bootstrap";
import React, { Component } from "react";
import ReactWizard from "react-bootstrap-wizard";

class FirstStep extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      firstStep: "1 Step",
    };
  }
  render() {
    return (
      <p>Borrow goes here</p>
      /*
        <Form>
        <Form.Group controlId="formBasicEmail">
          <Form.Label>Wallet</Form.Label>
          <Form.Control type="email" placeholder="Enter email" />
          <Form.Text className="text-muted">Wallet Address.</Form.Text>
        </Form.Group>
        <Form.Group controlId="formBasicPassword">
          <Form.Label>Amount</Form.Label>
          <Form.Control type="text" placeholder="Amount" />
        </Form.Group>
        <Form.Group controlId="formBasicDuration">
          <Form.Label>Duration</Form.Label>
          <Form.Control type="text" placeholder="Enter time duration" />
          <Form.Text className="text-muted">Duration</Form.Text>
        </Form.Group>
      </Form>
      */
    );
  }
}

class SecondStep extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      secondStep: "second step here",
    };
  }
  isValidated() {
    // do some validations
    // decide if you will
    return true;
    // or you will
    // return false;
  }
  render() {
    return <div>Confirmation stuff goes here</div>;
  }
}

var steps = [
  // this step hasn't got a isValidated() function, so it will be considered to be true
  { stepName: "1st Step", component: FirstStep },
];

class DashTable extends Component {
  finishButtonClick(allStates) {
    console.log(allStates);
  }
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
                  <a href="/view" class="badge badge-light">
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
                  <a href="/view" class="badge badge-light">
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

export default class Borrow extends Component {
  render() {
    return (
      <div>
        <section class="jumbotron text-center border-bottom shadow-sm">
          <div class="container">
            <h2>Borrow</h2>
          </div>
        </section>
        <Container fluid style={{ marginTop: "15px" }}>
          <Row>
            <Col xs={12} md={6} className="mr-auto ml-auto">
              <ReactWizard
                steps={steps}
                title="Borrow"
                description=""
                headerTextCenter
                validate
                color="primary"
                finishButtonClick={this.finishButtonClick}
              />
            </Col>
          </Row>
        </Container>
      </div>
    );
  }
}
