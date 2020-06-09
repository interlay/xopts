import React, { Component } from "react";
import { Col, Row, Table } from "react-bootstrap";
import sellImage from "../assets/img/process/sell.png";

export default class HelpSell extends Component {

  render() {
    return <div class="col-xl-8 offset-xl-2 text-justify border-top" id="sell-help">
      <Table>
      <Row>
        <Col xl={{ span: 12 }}>
          <h2 class="mt-5">How to Offer Options for Sale</h2>
          <p>
            Follow this process to offer options for sale and earn a premium in Dai.
            Options differ in their expiry time, i.e. until when the option is valid, the premium, i.e. the fee you receive, and the strike price, i.e. how much DAI you will pay to receive BTC in return if when a buyer exercises the option.
            In our step-by-step guide below you will act as Bob.
          </p>
        </Col>
        <Col xl={{ span: 10, offset: 1 }}>
          <img src={sellImage} class="img-fluid" alt="sell-process"/>
        </Col>
      </Row>

      <Row class="mt-2">
        <Col xl={{ span: 3}}>
          <h6>1: Select Your Option</h6>
          <p>
            First, select an option that you want to underwrite.
            You can click "sell" right next to the option that you prefer.
            This will open the sell wizard to guide you through the process.
          </p>
        </Col>
        <Col xl={{ span: 3}}>
          <h6>2: Select Your Amount</h6>
          <p>
            The second step of selling an option is to state how much DAI you want to include to underwrite BTC options.
            The maximum absolute premium you can earn depends on how much DAI you deposit into the system.
          </p>
        </Col>
        <Col xl={{ span: 3}}>
          <h6>3: Provide an Address</h6>
          <p>
            The third step of selling an option is to provie a BTC address.
            When a buyer exercises the option, this is the address that she will sent BTC to.
          </p>
        </Col>
        <Col xl={{ span: 3}}>
          <h6>4: Confirm Your Options</h6>
          <p>
            The last step executes the selling by interacting with the XOpts smart contracts. If this is your first time interacting with XOpts
            you might asked to approve an amount of your DAI in the XOpts smart contracts.
            In this case, you will be asked to confirm two transactions: (a) the approval transaction
            and (b) the underwriting transaction.
            The underwriting transaction will then transfer the amount of DAI you indicated into the XOpts smart contracts.
            Buyers will then be able to buy options you are offering!
          </p>
        </Col>
      </Row>
      </Table>
    </div>;
  }
}
