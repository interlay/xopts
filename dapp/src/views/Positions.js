import React, { Component } from "react";
import { Container, Image } from "react-bootstrap";
import UserPurchasedOptions from "../components/UserPurchasedOptions.js";
import UserSoldOptions from "../components/UserSoldOptions.js";
import { Redirect } from "react-router-dom";
import bitcoinImg from "../assets/img/icons/32/btc.png";
import daiImg from "../assets/img/icons/32/dai.png";
export default class Dashboard extends Component {

  componentDidMount(){
    this.forceUpdate();
  }
  
  render() {
    if(!this.props.isLoggedIn){
      return <Redirect to="/trade" />
    }
    return (
      <div>
        <section className="jumbotron text-center border-bottom shadow-sm">
          <Container>
            <h2>Your Positions</h2>
            <p className="lead text-muted">Account: {this.props.address} </p>
            <h4> BTC <Image src={bitcoinImg}/> - DAI <Image src={daiImg} /></h4>
            <a className="nav-link" href="https://www.cryptocompare.com/" target="__blank"> 
            {this.props.btcPrices.dai} BTC/DAI  &nbsp; - &nbsp;
            {this.props.btcPrices.usd} BTC/USD &nbsp; - &nbsp;
            {this.props.daiPrices.usd} DAI/USD
            </a>
          </Container>
        </section>
        <Container fluid>
          <section>
            <UserPurchasedOptions {...this.props} />
          </section>
          <section className="mt-5 mb-5">
            <UserSoldOptions {...this.props} />
          </section>
        </Container>
      </div>
    );
  }
}






/*

import { Container, Row, Table, Col } from "react-bootstrap";
import React, { Component } from "react";

className DashTable extends Component {
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
                <th>Timestamp</th>
                <th>Status</th>
                <th>Total</th>
                <th>ID</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <th>2020/10/25</th>
                <td>
                  <span className="badge badge-pill badge-success">Minted</span>
                </td>
                <td>100 BTC</td>
                <td>
                  6abe96c9ac613da4fa4ef69045f5a792b9d20305e16a8491775710c66183b343
                </td>
                <th>
                  <a href="/view" className="badge badge-info mx-2">
                    View
                  </a>
                  <a href="/view" className="badge badge-success mx-2">
                    Extend
                  </a>
                </th>
              </tr>
              <tr>
                <th>2020/10/25</th>
                <td>
                  <span className="badge badge-pill badge-info">Extended</span>
                </td>
                <td>100 BTC</td>
                <td>
                  6abe96c9ac613da4fa4ef69045f5a792b9d20305e16a8491775710c66183b343
                </td>
                <th>
                  <a href="/view" className="badge badge-info mx-2">
                    View
                  </a>
                </th>
              </tr>
              <tr>
                <th>2020/10/25</th>
                <td>
                  <span className="badge badge-pill badge-danger">Withdrawn</span>
                </td>
                <td>100 BTC</td>
                <td>
                  6abe96c9ac613da4fa4ef69045f5a792b9d20305e16a8491775710c66183b343
                </td>
                <th>
                  <a href="/view" className="badge badge-info mx-2">
                    View
                  </a>
                  <a href="/view" className="badge badge-success mx-2">
                    Recover
                  </a>
                </th>
              </tr>
              <tr>
                <th>2020/10/25</th>
                <td>
                  <span className="badge badge-pill badge-danger">Withdrawn</span>
                </td>
                <td>100 BTC</td>
                <td>
                  6abe96c9ac613da4fa4ef69045f5a792b9d20305e16a8491775710c66183b343
                </td>
                <th>
                  <a href="/view" className="badge badge-info mx-2">
                    View
                  </a>
                  <a href="/view" className="badge badge-success mx-2">
                    Recover
                  </a>
                </th>
              </tr>
              <tr>
                <th>2020/10/26</th>
                <td>
                  <span className="badge badge-pill badge-primary">Earning</span>
                </td>
                <td>1 BTC</td>
                <td>
                  6abe96c9ac613da4fa4ef69045f5a792b9d20305e16a8491775710c66183b343
                </td>
                <th>
                  <a href="/view" className="badge badge-info mx-2">
                    View
                  </a>
                </th>
              </tr>
            </tbody>
          </Table>
        </Row>
      </Container>
    );
  }
}
export default className Dashboard extends Component {
  render() {
    return (
      <div>
        <section className="jumbotron text-center border-bottom shadow-sm">
          <div className="container">
            <a
              href="/borrow"
              className="btn btn-primary m-2"
              style={{ width: "100px" }}
            >
              Borrow
            </a>
            <a
              href="/insure"
              className="btn btn-primary m-2"
              style={{ width: "100px" }}
            >
              Insure
            </a>
            <a
              href="/underwrite"
              className="btn btn-primary m-2"
              style={{ width: "100px" }}
            >
              Underwrite
            </a>
            <a
              href="/lend"
              className="btn btn-primary m-2"
              style={{ width: "100px" }}
            >
              Lend
            </a>
          </div>
        </section>
        <Container className="p-3">
          <Row>
            <Col>
              <button type="button" className="btn btn-secondary my-4">
                Total Minted &nbsp;
                <span className="badge badge-light">109.92 BTC</span>
              </button>
            </Col>
            <Col>
              <button type="button" className="btn btn-secondary my-4">
                Total Earnt &nbsp;
                <span className="badge badge-light">10.2 BTC</span>
              </button>
            </Col>
            <Col>
              <button type="button" className="btn btn-secondary my-4">
                Total Locked &nbsp;
                <span className="badge badge-light">4.2%</span>
              </button>
            </Col>
            <Col>
              <button type="button" className="btn btn-secondary my-4">
                Pending Mint &nbsp;
                <span className="badge badge-light">1 BTC</span>
              </button>
            </Col>
          </Row>
        </Container>
        <DashTable heading="Transactions" />
      </div>
    );
  }
}

*/