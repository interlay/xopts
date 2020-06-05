import React, { Component } from "react";
import { withRouter, NavLink } from 'react-router-dom'

class LandingPage extends Component {
  
  render() {
    return (
      <div>
        <section className="jumbotron text-center white-background">
          <div className="container">
            <h1>Non-Custodial Bitcoin Options</h1>
            <h3 className="lead text-muted">Buy and Sell Insurance against Bitcoin Price Fluctuations. </h3>
            <h3 className="lead text-muted">Keep Control Over You Coins.</h3>
            <NavLink to="/market">Market</NavLink>
          </div>
        </section>
      </div>
    );
  }
}

export default withRouter(LandingPage);
