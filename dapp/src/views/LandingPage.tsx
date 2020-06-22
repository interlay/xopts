import React, { Component } from "react";
import { withRouter, NavLink } from 'react-router-dom';
import { Image, Container, Button, Col, Row } from "react-bootstrap";

import buysellImg from "../assets/img/icons/buy-sell.png";
import noncustodialImg from "../assets/img/icons/noncustodial.png";
import opensourceImg from "../assets/img/icons/open-source.png";
import paybtcImg from "../assets/img/icons/paybtc.png";
import permissionlessImg from "../assets/img/icons/permissionless.png";
import premiumImg from "../assets/img/icons/premium.png";
import trustlessImg from "../assets/img/icons/trustless.png";

export default class LandingPage extends Component {

  render() {
    return (
      <div>
        <section className="jumbotron text-center white-background mt-2">
          <div className="container mt-5">
            <h1 style={{ fontSize: "3.4em" }}>Trustless, Non-Custodial Bitcoin Options</h1>
            <h3 style={{ fontSize: "1.5em" }} className="lead text-muted mt-3">Trade Bitcoin Options. Keep Control Over Your Funds.</h3>

            <Row className="mt-4">
              <Col className="mt-2" xs="12" sm={{ span: 4, offset: 2 }} lg={{ span: 2, offset: 4 }}>
                <NavLink className="text-decoration-none" to="/trade"><Button variant="outline-primary" size="lg" block>Trade</Button></NavLink>
              </Col>
              <Col className="mt-2" xs="12" sm={{ span: 4 }} lg={{ span: 2 }}>
                <NavLink className="text-decoration-none" to="/help"><Button variant="outline-dark" size="lg" block>Guide</Button></NavLink>
              </Col>
            </Row>
          </div>
        </section>
        <Container fluid>
          <section className="jumbotron text-center">
            <Col xl={{ span: 6, offset: 3 }}>

              <Row className="">
                <Col md={{ span: 4 }} className="text-center">
                  <Image rounded src={buysellImg} width="64"></Image>
                  <h4 className="mt-2">Hedge BTC Risk</h4>
                  <p>Secure yourself against BTC volatility.</p>
                </Col>
                <Col md={{ span: 4 }} className="text-center">
                  <Image rounded src={paybtcImg} width="64"></Image>
                  <h4 className="mt-2">Pay in Bitcoin</h4>
                  <p>Settle in native BTC. No need for wrapped tokens.</p>
                </Col>
                <Col md={{ span: 4 }} className="text-center">
                  <Image rounded src={premiumImg} width="64"></Image>
                  <h4 className="mt-2">Earn Premium</h4>
                  <p>Sell insurance to earn premium in DAI, other stablecoins, or ETH.</p>
                </Col>
              </Row>

              <Row className="mt-4">
                <Col md={{ span: 4 }} className="text-center">
                  <Image rounded src={trustlessImg} width="64"></Image>
                  <h4 className="mt-3">Trustless</h4>
                  <p>XOpts is fully decentralized and uses no intermediaries.</p>
                </Col>
                <Col md={{ span: 4 }} className="text-center">
                  <Image rounded src={noncustodialImg} width="64"></Image>
                  <h4 className="mt-3">Non-Custodial</h4>
                  <p>You keep control over your funds at all times.</p>
                </Col>
                <Col md={{ span: 4 }} className="text-center">
                  <Image rounded src={permissionlessImg} width="64"></Image>
                  <h4 className="mt-3">Permissionless</h4>
                  <p>Anyone can create and price their own options, without restriction.</p>
                </Col>
              </Row>
            </Col>
          </section>
        </Container>
      </div>
    );
  }
}