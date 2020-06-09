import React, { Component } from "react";
import { withRouter } from 'react-router-dom';
import { Image, Container, Row, Col, Button } from "react-bootstrap";
import { NavHashLink as NavLink } from 'react-router-hash-link';

import HelpBuy from '../components/HelpBuy.js';
import HelpExercise from '../components/HelpExercise.js';
import HelpSell from '../components/HelpSell.js';
import HelpRefund from '../components/HelpRefund.js';

class Help extends Component {


  render() {
    return (
      <div>
        <section className="jumbotron text-center">
          <div className="container">
            <h2>XOpts User Guide</h2>
            <h3 className="lead text-muted">Learn how to buy and sell BTC options.</h3>
          </div>
        </section>
        <Container fluid>
          <section class="col-xl-8 offset-xl-2">
            <h2>Guides</h2>
                <div>
                  <li class="list-group-item border-0"><a href="#buy-help" class="list-group-item-action">How to Buy Options</a></li>
                  <li class="list-group-item border-0"><a href="#execute-help" class="list-group-item-action">How to Exercise Options</a></li>
                  <li class="list-group-item border-0"><a href="#sell-help" class="list-group-item-action">How to Sell Options</a></li>
                  <li class="list-group-item border-0"><a href="#refund-help" class="list-group-item-action">How to Refund Expired Options</a></li>
                </div>
          </section>
          <section class="mt-5">
            <HelpBuy />
          </section>
          <section class="mt-5">
            <HelpExercise />
          </section>
          <section class="mt-5">
            <HelpSell />
          </section>
          <section class="mt-5">
            <HelpRefund />
          </section>
        </Container>
      </div>
    );
  }
  /*
  render() {
    return (
      <div>
        <section className="jumbotron text-center">
          <div className="container">
            <h2>XOpts User Guide</h2>
            <h3 className="lead text-muted">Step-by-step Guides For: </h3>
            <Row className="mt-3">
              <Col xs={{ span: 4, offset: 2 }} lg={{ span: 2, offset: 4 }}>
                <NavLink className="text-decoration-none" to="#buy"><Button variant="outline-primary" size="md" block>Buy</Button></NavLink>
              </Col>
              <Col xs={{ span: 4 }} lg={{ span: 2 }}>
                <a className="text-decoration-none" href="#buy"><Button variant="outline-dark" size="md" block>Sell</Button></a>
              </Col>
            </Row>
            <Row className="mt-3">
              <Col xs={{ span: 4, offset: 2 }} lg={{ span: 2, offset: 4 }}>
                <NavLink className="text-decoration-none" to="#exercise"><Button variant="outline-warning" size="md" block>Exercise</Button></NavLink>
              </Col>
              <Col xs={{ span: 4 }} lg={{ span: 2 }}>
                <a className="text-decoration-none" href="#refund"><Button variant="outline-info" size="md" block>Refund</Button></a>
              </Col>
            </Row>
          </div>
        </section>
        <Container fluid>
          <section id="buy">
            <HelpBuy />
          </section>
          <section id="sell" className="mt-3">
            <HelpBuy />
          </section>
          <section id="exercise" className="mt-3">
            <HelpBuy />
          </section>
          <section id="refund" className="mt-3">
            <HelpBuy />
          </section>
        </Container>
      </div>
    );
  }
  */
}

export default withRouter(Help);
