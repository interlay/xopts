import React, { Component } from "react";
import { withRouter } from 'react-router-dom';
import { Table, Container, Row, Col } from "react-bootstrap";

import HelpBuy from '../components/HelpBuy';
import HelpExercise from '../components/HelpExercise';
import HelpSell from '../components/HelpSell';
import HelpRefund from '../components/HelpRefund';

export default class Help extends Component {
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
          <section className="col-xl-8 offset-xl-2">
            <h2>Guides</h2>
            <div>
              <li className="list-group-item border-0"><a href="#getting-started" className="list-group-item-action">Getting Started</a></li>
              <li className="list-group-item border-0"><a href="#buy-help" className="list-group-item-action">How to Buy Options</a></li>
              <li className="list-group-item border-0"><a href="#execute-help" className="list-group-item-action">How to Exercise Options</a></li>
              <li className="list-group-item border-0"><a href="#sell-help" className="list-group-item-action">How to Sell Options</a></li>
              <li className="list-group-item border-0"><a href="#refund-help" className="list-group-item-action">How to Refund Expired Options</a></li>
            </div>
          </section>
          <section className="mt-5">
            <div className="col-xl-8 offset-xl-2 text-justify border-top" id="getting-started">
              <Table>
                <Row>
                  <Col xl={{ span: 12 }}>
                    <h2 className="mt-5">Getting Started</h2>
                      <p>XOpts is deployed on the <a href="https://ropsten.etherscan.io/" target="__blank"> Ethereum Ropsten testnet</a> and accepts payments in <a href="https://blockstream.info/testnet/" target="__blank">testnet Bitcoin</a>. </p>

                      <p>To test XOpts, you will need the following things: </p>

                      <h6>Wallets</h6>
                      <ul>
                        <li>Ethereum web wallet, e.g. <a href="https://metamask.io/" target="__blank">Metamask</a> or similar. </li>
                        <li>Bitcoin testnet wallet, e.g. the <a href="https://play.google.com/store/apps/details?id=de.schildbach.wallet_test" target="__blank">"Testnet Wallet"</a></li>
                      </ul>

                      <h6>Testnet funds</h6>
                      We provide links to faucets in the topbar.
                      <ul>
                        <li>Testnet (Ropsten) ETH. You need this to pay transaction fees. <a href="https://metamask.io/" target="__blank">Get from faucet</a>.</li>
                        <li>Testnet BTC. <a href="https://metamask.io/" target="__blank">Get from faucet</a>. </li>
                        <li>Testnet DAI. <strong>We provide this. Simply press the "Get testnet DAI" button in the topbar</strong> (appears when you connect your wallet).</li>
                      </ul>

                      <h6>For developers</h6>
                      You can check out the code on <a href="https://github.com/interlay/xopts" target="__blank">Github</a>. 
                  </Col>
                </Row>
              </Table>
            </div>

          </section>
          <section className="mt-5">
            <HelpBuy />
          </section>
          <section className="mt-5">
            <HelpExercise />
          </section>
          <section className="mt-5">
            <HelpSell />
          </section>
          <section className="mt-5">
            <HelpRefund />
          </section>
        </Container>
      </div>
    );
  }
}