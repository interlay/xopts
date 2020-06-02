import React, { Component } from "react";
import { Image} from "react-bootstrap";
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
        <OptionList {...this.props} />
      </div>
    );
  }
}

export default withRouter(Home);
