import React, { Component } from "react";
import {  Button, Container, Row, Table } from "react-bootstrap";

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
                  <Button>Insure for $10</Button>
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
                    <td>$1000</td>
                    <td>$100</td>
                    <td>$90</td>
                    <td>$-10</td>
                    <td>24:00:01</td>
                  </tr>
                </tbody>
              </Table>
            </Row>
          </Container>
        );
    }
}

export default class Insure extends Component {
  render() {
    return (
      <div>
        <section class="jumbotron text-center border-bottom shadow-sm">
          <div class="container">
            <h1>Insure</h1>
          </div>
        </section>
        <CurrentTable heading="Current" />
        <AvailableTable heading="Available" />
      </div>
    );
  }
}
