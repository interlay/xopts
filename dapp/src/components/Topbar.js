import { Navbar, Nav, Badge} from "react-bootstrap";
import React, { Component } from "react";
import { Link } from "react-router-dom";

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
          <Nav.Link href="/dashboard">
          <Badge pill variant="success">
            {this.props.address}
            </Badge>
          </Nav.Link>
        </Navbar.Collapse>
      </Navbar>
    );
  }
}

export default TopBar;
