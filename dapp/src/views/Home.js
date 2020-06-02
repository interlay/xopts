import React, { Component } from "react";
<<<<<<< HEAD
import { Image} from "react-bootstrap";
=======
import { Col, Container, Row, Table, Button } from "react-bootstrap";
import { fetchJson } from "ethers/utils";
>>>>>>> master
import OptionList from "../components/OptionList.js"
import { withRouter } from 'react-router-dom'
import bitcoinImg from "../assets/img/icons/32/btc.png";
import daiImg from "../assets/img/icons/32/dai.png";

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
            <h4> BTC <Image src={bitcoinImg}/> - DAI <Image src={daiImg} /></h4>
            
          </div>
        </section>
        
        <Container fluid>
          <section className="mb-5">
            <OptionList {...this.props} />
          </section>
        </Container>

      </div>
    );
  }
}

export default withRouter(Home);
