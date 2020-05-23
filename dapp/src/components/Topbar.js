import { Navbar, Nav, Badge } from "react-bootstrap";
import React, { Component } from "react";
import { Link } from "react-router-dom";
import { withRouter } from 'react-router-dom'



class Web3LogIn extends Component {


  async logIn() {
    let web3 = window.web3;
    if (typeof web3 !== 'undefined') {
      try {
        let ethereum = await window.ethereum.enable();
        let signer = await this.props.provider.getSigner();
        let address = await signer.getAddress();
        this.setState({
          isLoggedIn: true,
          signer: signer,
          address: address
        });
        this.forceUpdate();
      } catch (error) {
        console.log(error);
      }
    }
  }

  handleLogIn() {
    this.logIn();
  }

  render() {
    if (this.props.isLoggedIn) {
      return (
        <Link className="nav-link" to="/dashboard">
          <Badge pill variant="success"> {this.props.address}</Badge>
        </Link>)
    } else if (this.props.isWeb3) {
      return <Link className="nav-link" to=""><Badge pill variant="dark" onClick={() => { this.handleLogIn() }}> Connect Wallet</Badge></Link>
    } else {
      return <Link className="nav-link" to="https://metamask.io/download.html" target="__blank"><Badge pill variant="primary"> Get MetaMask</Badge></Link>
    }
  }
}

const Web3LogInWithRouter = withRouter (Web3LogIn);


class TopBar extends Component {

  render() {
    return (
      <Navbar bg="light" expand="md" className="border-bottom shadow-sm">
        <Navbar.Brand href="/">XOpts</Navbar.Brand>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="mr-auto">
            <Link className="nav-link" to="/">
              Exchange
            </Link>
            {this.props.isLoggedIn &&
              <Link className="nav-link" to="/dashboard">
                Account
            </Link>
            }
          </Nav>
          <Nav>
            <Web3LogInWithRouter {...this.props} />
          </Nav>
        </Navbar.Collapse>
      </Navbar>
    );
  }
}

export default withRouter (TopBar);
