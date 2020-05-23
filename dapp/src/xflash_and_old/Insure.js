import React, { Component, useState } from "react";
import { Button, Col, Container, Row, Table, Modal } from "react-bootstrap";

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
