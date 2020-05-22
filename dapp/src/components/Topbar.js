import { Navbar, Nav, Form, Image } from "react-bootstrap";
import React, { Component } from "react";
import { Link } from "react-router-dom";

class TopBar extends Component {
  render() {
    return (
      <Navbar bg="light" expand="md" className="border-bottom shadow-sm">
        <Navbar.Brand href="/home">XOpts</Navbar.Brand>
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
