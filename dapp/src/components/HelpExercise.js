import React, { Component } from "react";
import { Col, Row, Table } from "react-bootstrap";
import requestExerciseImage from "../assets/img/process/exercise-1.png";
import executeExerciseImage from "../assets/img/process/exercise-2.png";

export default class HelpSell extends Component {

  render() {
    return <div class="col-xl-8 offset-xl-2 text-justify border-top" id="execute-help">
      <Table>
      <Row>
        <Col xl={{ span: 12 }}>
          <h2 class="mt-5">How to Exercise Options</h2>
          <p>
            Once you have bought an option you can exercise them until their expiry date.
            Note that you do not have to exercise the option, i.e. you have the right to do so but no obligation.
            The process to exercise an option is split into two parts.
            First, you need to <i>exercise the option by sending a BTC transaction</i>.
            Second, you can prove that you made the BTC transaction and thereby <i>claim the DAI for executing the option</i>.
          </p>
        </Col>
      </Row>
      <Row>
        <Col xl={{ span: 12 }}>
          <h3>Part 1: Exercise the Option</h3>
          <p>
            The first process will guide you through sending a BTC transaction to the seller of the option.
              Sending a BTC transaction can be proved by a so-called <a href="https://en.bitcoinwiki.org/wiki/Simplified_Payment_Verification" target="_blank">SPV proof</a>.
            Hence, to completed the process we only need the proof (which we will fetch for you) and don't require the seller of the option to interact with you.
          </p>
        </Col>
        <Col xl={{ span: 10, offset: 1 }}>
          <img src={requestExerciseImage} class="img-fluid" alt="exercise-process"/>
        </Col>
      </Row>

      <Row class="mt-5">
        <Col xl={{ span: 3}}>
          <h6>1: Select Your Option</h6>
          <p>
            In the "Positions" view, select an option that you want to exercise.
            To do this, click "Pay".
            This will open the exercise wizard to guide you through the process.
            There click the option with the seller that you want to exercise.
          </p>
        </Col>
        <Col xl={{ span: 3}}>
          <h6>2: Select Your Position</h6>
          <p>
            Next, select the position you want to exercise.
            In case you bought one option type from multiple sellers, you will have to exercise each one individually.
          </p>
        </Col>
        <Col xl={{ span: 3}}>
          <h6>3: Submit the Payment</h6>
          <p>
            The third step of exercising an option is to make the BTC payment to the seller.
            Scan the QR code with your favorite BTC wallet to make a payment to the seller.
            You can verify the correct data with the summary that is displayed below.
            Make sure you note down the BTC transaction id!
          </p>
        </Col>
        <Col xl={{ span: 3}}>
          <h6>4: Provide the BTC Transaction</h6>
          <p>
            The last step of exercising an option is to provide the transaction id of the payment transaction of the previous step.
            This will store the transaction id locally in your browser.
            We now have to wait that the transaction has enough confirmations to finalize the process.
            You will see a new button "confirm" under your option.
            In the background, XOpts will try to query the current state of your transaction.
          </p>
        </Col>
      </Row>
      <Row>
        <Col xl={{ span: 12 }}>
          <h3>Part 2: Confirm Exercising the Option</h3>
          <p>
            The second part assumes you have completed the first part and have a Bitcoin transaction id and can see the "confirm" button.
            As mentioned above, sending a BTC transaction can be proved by a so-called <a href="https://en.bitcoinwiki.org/wiki/Simplified_Payment_Verification" target="_blank">SPV proof</a>.
            XOpts fetches this transaction inclusion proof to verify that you made the correct BTC payment.
            Once the transaction has enough confirmations and a valid proof, you can withdraw the equivalent amount of DAI as agreed by the strike price for your BTC amount.
          </p>
        </Col>
        <Col xl={{ span: 10, offset: 1 }}>
          <img src={executeExerciseImage} class="img-fluid" alt="exercise-process"/>
        </Col>
      </Row>

      <Row class="mt-5">
        <Col xl={{ span: 4}}>
          <h6>1: Select Your Option</h6>
          <p>
            In the "Positions" view, select an option that you want to confirm.
            To do this, click "Confirm".
            This will open the confirm window.
          </p>
        </Col>
        <Col xl={{ span: 4}}>
          <h6>2: Confirm Your BTC Payment</h6>
          <p>
            Once your BTC transaction has enough confirmations, you can click "Confirm" to send a confirmation transaction to the XOpts smart contract.
            This transaction will submit the transaction inclusion proof and will exercise your option.
            Upon success of this transaction, you will receive the agreed amount of DAI in return.
          </p>
        </Col>
        <Col xl={{ span: 4}}>
          <h6>3: [Optional] Cancel</h6>
          <p>
            In case your BTC transaction is stuck, you are able to remove the transaction from the to-be-confirmed transactions by XOpts.
            WARNING: Make sure you are not sending multiple BTC transactions to the same seller!
            You can double-spend your own transaction in case you want to make the transaction again.
            Make sure you know what you are doing.
          </p>
        </Col>
      </Row>
      </Table>
    </div>;
  }
}
