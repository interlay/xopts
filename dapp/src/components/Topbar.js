import { Navbar, Nav, Badge } from "react-bootstrap";
import React, { Component } from "react";
import { Link } from "react-router-dom";



class Web3LogIn extends Component {

  componentDidMount() {
    console.log(this.props.isLoggedIn);
  }

  componentDidUpdate() {
    console.log(this.props.isLoggedIn);
}

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
    if (this.props.isLoggedIn){
      return (
      <Nav.Link>
        <Badge pill variant="success"> {this.props.address}</Badge>
      </Nav.Link>)
    } else if (this.props.isWeb3) {
      return <Nav.Link><Badge pill variant="dark" onClick={() => { this.handleLogIn() }}> Connect Wallet</Badge></Nav.Link>
    } else {
      return  <Nav.Link href="https://metamask.io/download.html" target="__blank"><Badge pill variant="primary"> Get MetaMask</Badge></Nav.Link>
    }
  }
}

class TopBar extends Component {

  render() {
    return (
      <Navbar bg="light" expand="md" className="border-bottom shadow-sm">
        <Navbar.Brand href="/">XOpts</Navbar.Brand>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="mr-auto">
            <Link className="nav-link" to="/insure">
              Insure
            </Link>
            <Link className="nav-link" to="/underwrite">
              Underwrite
            </Link>
          </Nav>
            <Web3LogIn {...this.props} />
        </Navbar.Collapse>
      </Navbar>
    );
  }
}

export default TopBar;
