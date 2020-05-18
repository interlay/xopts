import { NavDropdown, Navbar, Nav, Form, Image } from "react-bootstrap";
import React, { Component } from "react";
import { Link } from "react-router-dom";

class TopBar extends Component {
  render() {
    return (
      <Navbar bg="light" expand="lg" className="border-bottom shadow-sm">
        <Navbar.Brand href="#home">XFLASH</Navbar.Brand>
        <Navbar.Toggle aria-controls="basic-navbar-nav" />
        <Navbar.Collapse id="basic-navbar-nav">
          <Nav className="mr-auto">
            <Link className="nav-link" to="/">
              Home
            </Link>
            <Link className="nav-link" to="/audit">
              Audit
            </Link>
          </Nav>

          <a
            href="/borrow"
            class="btn btn-primary m-2"
            style={{ width: "100px" }}
          >
            Borrow
          </a>
          <a
            href="/insure"
            class="btn btn-primary m-2"
            style={{ width: "100px" }}
          >
            Insure
          </a>
          <a
            href="/underwrite"
            class="btn btn-primary m-2"
            style={{ width: "100px" }}
          >
            Underwrite
          </a>
          <a
            href="/lend"
            class="btn btn-primary m-2"
            style={{ width: "100px" }}
          >
            Lend
          </a>
          <Form inline>
            <Nav.Link href="/dashboard">
              <Image
                src="avatar.png"
                thumbnail
                style={{ height: "64px", width: "64px" }}
              />
            </Nav.Link>
          </Form>
        </Navbar.Collapse>
      </Navbar>
    );
  }
}

export default TopBar;
