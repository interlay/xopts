import React, { Component } from "react";
import { Col } from "react-bootstrap";
import { Redirect } from "react-router-dom";
import UserPending from "../components/UserPending.js";
import { ToastContainer, toast } from 'react-toastify';
import { FaBitcoin } from "react-icons/fa";

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
            <h2>Pending <FaBitcoin/> Transactions</h2>
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
          <UserPending toast={toast} reloadPending={this.reloadPending} {...this.props}/>
        </Col>
      </div>
    );
  }
}