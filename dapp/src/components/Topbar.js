import { Navbar, Nav, Badge, Image, Tooltip, OverlayTrigger } from "react-bootstrap";
import React, { Component } from "react";
import { Link } from "react-router-dom";
import { withRouter } from 'react-router-dom'
import xoptsLogo from "../assets/img/xopts.png";
import { FaBell, FaGavel, FaUser } from 'react-icons/fa';

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
    if (this.props.isLoggedIn) {
      return (
        <Link className="nav-link" to="/dashboard">
          <Badge pill variant="success"> {this.props.address}</Badge>
        </Link>)
    } else if (this.props.isWeb3) {
      return <Link className="nav-link" to="#"><Badge pill variant="dark" onClick={() => { this.handleLogIn() }}> Connect Wallet</Badge></Link>
    } else {
      return <a className="nav-link" href="https://metamask.io/download.html" target="__blank"><Badge pill variant="primary"> Get MetaMask</Badge></a>
    }
  }
}

const Web3LogInWithRouter = withRouter (Web3LogIn);

const NavigationOverlay = ({ tip, link, children }) => (
  <OverlayTrigger
    placement="bottom"
    delay={{ show: 250, hide: 400 }}
    overlay={
      <Tooltip>
        {tip}
      </Tooltip>
    }
  >
    <Link className="nav-link" to={link}>
      {children}
    </Link>
  </OverlayTrigger>
)

class TopBar extends Component {
  

  render() {
    return (
      <Navbar bg="light" expand="lg" className="border-bottom shadow-sm">
        <Navbar.Brand> <Image src={xoptsLogo} width="30" className="d-inline-block align-top" height="30" fluid/><Link to="/" className="text-decoration-none"> XOpts</Link></Navbar.Brand>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="mr-auto">
            <NavigationOverlay tip="Market" link="/market"><FaGavel/></NavigationOverlay>
            {this.props.isLoggedIn &&
              <NavigationOverlay tip="Account" link="/dashboard"><FaUser/></NavigationOverlay>
            }
            <a className="nav-link" href="https://www.cryptocompare.com/" target="__blank"> | &nbsp; Prices: &nbsp;
            {this.props.btcPrices.dai} BTC/DAI, &nbsp;
            {this.props.btcPrices.usd} BTC/USD, &nbsp;
            {this.props.daiPrices.usd} DAI/USD
            </a>
          </Nav>
          {this.props.isLoggedIn && this.props.hasPendingOptions() &&
            <Nav>
              <NavigationOverlay tip="Pending" link="/pending"><FaBell/></NavigationOverlay>
            </Nav>
          }
          <Nav>
            <Web3LogInWithRouter {...this.props} />
          </Nav>
        </Navbar.Collapse>
      </Navbar>
    );
  }
}

export default withRouter (TopBar);
