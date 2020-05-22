import React, { Component, useState } from "react";
import { Button, Col, Container, Row, Table, Modal } from "react-bootstrap";

class AvailableTable extends Component {
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
                <th>Strike Date</th>
                <th>Strike Price</th>
                <th>Nominal Amount</th>
                <th>Time to Expiry</th>
                <th>&nbsp;</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>2020/10/25</td>
                <td>$1000</td>
                <td>$100</td>
                <td>24:00:01</td>
                <td>
                  <Example>Insure for $10</Example>
                </td>
              </tr>
            </tbody>
          </Table>
        </Row>
      </Container>
    );
  }
}

class CurrentTable extends Component {
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
                <th>Strike Date</th>
                <th>Strike Price</th>
                <th>Nominal Amount</th>
                <th>Spot Price</th>
                <th>Delta</th>
                <th>Time to Expiry</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>2020/10/25</td>
                <td>$ 1000</td>
                <td>$ 100</td>
                <td>$ 90</td>
                <td>$ -10</td>
                <td>24:00:01</td>
              </tr>
            </tbody>
          </Table>
        </Row>
      </Container>
    );
  }
}

function Example() {
  const [show, setShow] = useState(false);

  const handleClose = () => setShow(false);
  const handleShow = () => setShow(true);

  return (
    <>
      <Button variant="primary" onClick={handleShow}>
        Launch demo modal
      </Button>

      <Modal show={show} onHide={handleClose}>
        <Modal.Header closeButton>
          <Modal.Title>Modal heading</Modal.Title>
        </Modal.Header>
        <Modal.Body>Woohoo, you're reading this text in a modal!</Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleClose}>
            Close
          </Button>
          <Button variant="primary" onClick={handleClose}>
            Save Changes
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}

export default class Insure extends Component {
  render() {
    return (
      <div>
        <section class="jumbotron text-center border-bottom shadow-sm">
          <div class="container">
            <h1>Buy Insurance</h1>
          </div>
        </section>
        <Container className="p-3">
          <Row>
            <Col>
              <button type="button" class="btn btn-secondary my-4">
                Total Balance &nbsp;
                <span class="badge badge-light">109.92 BTC</span>
              </button>
            </Col>
            <Col>
              <button type="button" class="btn btn-secondary my-4">
                Available Balance &nbsp;
                <span class="badge badge-light">20 BTC</span>
              </button>
            </Col>
            <Col>
              <button type="button" class="btn btn-secondary my-4">
                Total Liquidity &nbsp;
                <span class="badge badge-light">100,001.2 BTC</span>
              </button>
            </Col>
          </Row>
        </Container>
        <CurrentTable heading="Current Insurance Contracts" />
        <AvailableTable heading="Available Insurance Contracts" />
      </div>
    );
  }
}
