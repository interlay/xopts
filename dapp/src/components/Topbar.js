import { Navbar, Nav, Badge, Image, Button } from "react-bootstrap";
import React, { Component } from "react";
import { Link } from "react-router-dom";
import { withRouter } from 'react-router-dom'
import xoptsLogo from "../assets/img/xopts.png";
import { FaExchangeAlt, FaFileAlt, FaQuestionCircle } from 'react-icons/fa';
import BalanceTopbar from './BalanceTopbar.js';

class Web3LogIn extends Component {

  async logIn() {
    let web3 = window.web3;
    if (typeof web3 !== 'undefined') {
      try {
        await window.ethereum.enable();
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
    this.props.tryLogIn(true);
  }

  render() {
    if (this.props.isLoggedIn && this.props.address) {
      return (
        <Link className="nav-link" to="/positions">
          <Button  variant="outline-success" size="sm" style={{"border-radius": "1em"}}>  Account: {this.props.address.substring(0, 10)}...{this.props.address.substring(38)}</Button>
        </Link>)
    } else if (this.props.isWeb3) {
      return <Link className="nav-link" to="#"><Button size="sm" variant="outline-dark" onClick={() => { this.handleLogIn() }}> Connect Wallet</Button></Link>
    } else {
      return <a className="nav-link" href="https://metamask.io/download.html" target="__blank"><Button size="sm" variant="outline-primary"> Get MetaMask</Button></a>
    }
  }
}

const Web3LogInWithRouter = withRouter(Web3LogIn);

class TopBar extends Component {

  render() {
    return (
      <Navbar bg="light" expand="lg" className="border-bottom shadow-sm">
        <Navbar.Brand> <Image src={xoptsLogo} width="30" className="d-inline-block align-top" height="30" fluid /><Link to="/" className="text-decoration-none"> XOpts</Link></Navbar.Brand>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="mr-auto">
            <Link className="nav-link" to="/trade">
              Trade <FaExchangeAlt />
            </Link>

            {this.props.isLoggedIn &&
              <Link className="nav-link" to="/positions">
                Positions <FaFileAlt />
              </Link>
            }

            <Link className="nav-link" to="/help">
              Help <FaQuestionCircle />
            </Link>

          </Nav>
          <Nav>
            <BalanceTopbar {...this.props} />
          </Nav>
          <Nav>
            <Web3LogInWithRouter {...this.props} />
          </Nav>
        </Navbar.Collapse>
      </Navbar>
    );
  }
}

export default withRouter(TopBar);
