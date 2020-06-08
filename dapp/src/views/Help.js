import React, { Component } from "react";
import { withRouter } from 'react-router-dom';
import { Image, Container, Row, Col, Button } from "react-bootstrap";
import { NavHashLink as NavLink } from 'react-router-hash-link';

import HelpBuy from '../components/HelpBuy.js';

class Help extends Component {


  render() {
    return (
      <div>
        <section className="jumbotron text-center">
          <div className="container">
            <h2>XOpts User Guide</h2>
            <h3 className="lead text-muted">Coming soon.</h3>
          </div>
        </section>
        <Container fluid style={{height: "80vh"}}>
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
