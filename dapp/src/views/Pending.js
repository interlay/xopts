import React, { Component } from "react";
import { Col, Image} from "react-bootstrap";
import { Redirect } from "react-router-dom";
import UserPending from "../components/UserPending.js";
import { ToastContainer, toast } from 'react-toastify';
import { FaBitcoin } from "react-icons/fa";
import bitcoinImg from "../assets/img/icons/32/btc.png";
import blockstreamImg from "../assets/img/blockstream.png";

export default class Pending extends Component {
  constructor(props) {
    super(props);

    this.reloadPending = this.reloadPending.bind(this)
  }

  componentDidMount(){
    this.forceUpdate();
  }

  reloadPending() {
    this.forceUpdate();
  }
  
  render() {
    if(!this.props.isLoggedIn){
      return <Redirect to="/" />
    } else if (!this.props.hasPendingOptions()) {
      return <Redirect to="/" />
    }
    return (
      <div>
        <section className="jumbotron text-center border-bottom shadow-sm">
          <div className="container">
            <h2>Pending <Image src={bitcoinImg}/> Transactions</h2>
          </div>
        </section>
        <ToastContainer
          position="top-center"
          autoClose={5000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
        />
        <Col xl={{ span: 8, offset: 2 }}>
          <p>We monitor your pending transactions via the <Image src={blockstreamImg}  height="40" /> API.</p>
          <p>Once we detect your transaction, we <strong>automatically</strong> submit the proof to BTC-Relay on your behalf.</p>
          <p>Once verified, you only need to press "Confirm" to receive your DAI.</p>
          <UserPending toast={toast} reloadPending={this.reloadPending} {...this.props}/>
        </Col>
      </div>
    );
  }
}