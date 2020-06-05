import React, { Component } from "react";
import { withRouter, NavLink } from 'react-router-dom';
import { Image, Container} from "react-bootstrap";
import HelpBuy from '../components/HelpBuy.js';

class LandingPage extends Component {

  render() {
    return (
      <div>
        <section className="jumbotron text-center white-background">
          <div className="container">
            <h1 style={{fontSize: "3.8em"}}>Trustless, Non-Custodial Bitcoin Options</h1>
            <h3 className="lead text-muted">Trade Bitcoin Options. Keep Control Over You Coins.</h3>
            <NavLink to="/market">Market</NavLink>
          </div>
          <Container fluid>
            <section className="mb-5">
              <HelpBuy/>
            </section>
          </Container>
        </section>
      </div>
    );
  }
}

export default withRouter(LandingPage);
