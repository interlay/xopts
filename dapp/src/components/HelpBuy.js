import React, { Component } from "react";
import { Col, Row, Table, Card } from "react-bootstrap";
import buyImage from "../assets/img/process/buy.png";

export default class HelpBuy extends Component {

  render() {
    return <div class="col-xl-8 offset-xl-2 text-center">
      <Col xl={{ span: 8, offset: 2 }}>
        <Card>
          <h2>Buy Process</h2>
          <img src={buyImage} class="img-fluid" alt="buy-process"/>
        </Card>

      </Col>


    </div>;
  }
}

  //    <Carousel>
  //      <Carousel.Item>
  //        <img
  //          className="d-block w-100"
  //          src={ buyImage }
  //          alt="First slide"
  //        />
  //        <Carousel.Caption>
  //          <h3>Step 1: Select Your Option</h3>
  //          <p>
  //            Your first step in insuring your BTC is to select an option that suits your needs.
  //            You can click "buy" right next to the option that you prefer. Your decision will most
  //            likely depend on the expiry time (until when the option is valid), the premium (
  //            how much you have to pay to opbtain an option), and the strike price (how much DAI
  //            you will receive based on the amount of BTC you insure when you execute the option).
  //          </p>
  //        </Carousel.Caption>
  //      </Carousel.Item>
  //      <Carousel.Item>
  //        <img
  //          className="d-block w-100"
  //          src={ buyImage }
  //          alt="First slide"
  //        />
  //        <Carousel.Caption>
  //          <h3>Step 2: Select Your Seller</h3>
  //          <p>
  //            The second step of buying an option is to select a seller. Right now, the selection of a seller maps
  //            the bought option to the BTC address of a seller. This will become important when you want to
  //            execute the option.
  //          </p>
  //        </Carousel.Caption>
  //      </Carousel.Item>
  //      <Carousel.Item>
  //        <img
  //          className="d-block w-100"
  //          src={ buyImage }
  //          alt="Third slide"
  //        />

  //        <Carousel.Caption>
  //          <h3>Step 3: Select Your Amount</h3>
  //          <p>
  //            The third step of buying an option is to state how many BTC you want to insure.
  //            Your premium will be calculated based on the BTC amount you have selected.
  //          </p>
  //        </Carousel.Caption>
  //      </Carousel.Item>
  //      <Carousel.Item>
  //        <img
  //          className="d-block w-100"
  //          src={ buyImage }
  //          alt="Third slide"
  //        />

  //        <Carousel.Caption>
  //          <h3>Step 4: Confirm Your Purchase</h3>
  //          <p>
  //            The last step is to confirm your option purchase. You will see a summary
  //            of your selection. If this is your first time interacting with XOpts
  //            you might asked to approve an amount of your DAI in the XOpts smart contracts.
  //            In this case, you will be asked to confirm transactions: (1) The approval transaction
  //            and (2) the purchase transaction.
  //          </p>
  //        </Carousel.Caption>
  //      </Carousel.Item>
  //    </Carousel>
