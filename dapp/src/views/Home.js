import React, { Component } from "react";
import { Col, Container, Row, Table } from "react-bootstrap";
import { fetchJson } from "ethers/utils";
import OptionList from "../components/OptionList.js"
import { withRouter } from 'react-router-dom'

class Home extends Component {
  
  componentDidMount(){
    this.forceUpdate();
  }

  render() {
    return (
      <div>
        <section className="jumbotron text-center border-bottom shadow-sm">
          <div className="container">
            <h2>Buy and Sell Put Options</h2>
            <p className="lead text-muted">Available Markets:</p>
            
          </div>
        </section>
        <OptionList {...this.props} />
      </div>
    );
  }
}

export default withRouter(Home);
