import React from "react";
import { Container, ListGroup, ListGroupItem, Form, FormGroup, FormControl, Modal } from "react-bootstrap";
import * as utils from '../utils/utils.js'; 
import { showSuccessToast, showFailureToast } from '../controllers/toast';
import { SpinButton } from './SpinButton';
import { withRouter } from 'react-router-dom'

class SelectSeller extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      loaded: false,
      sellers: [],
      options: [],
    };
  }

  async componentDidUpdate() {
    if (this.props.optionContract && !this.state.loaded) {
      let [sellers, options] = await this.props.optionContract.getOptionSellers();
      this.setState({
        loaded: true,
        sellers: sellers,
        options: options,
      });
    }
  }

  renderOptions() {
    return this.state.sellers.map((seller, index) => {
      let address = seller.toString();
      let amount = utils.weiDaiToDai(this.state.options[index].toString());
      let amountBtc = utils.satToBtc(amount);
      let addressShow = address.substr(0,10) + '...';
      return (
        <option key={address} value={address} onClick={() => this.props.updateSatoshis(amount)}> {amountBtc} BTC (Seller: {addressShow})</option>
      );
    })
  }

  render() {
    if (this.props.currentStep !== 1) { // Prop: The current step
      return null
    }
    return(
      <FormGroup>
        <h5>Select Seller</h5>
        <Form.Control as="select" name="seller" defaultValue="default" onChange={this.props.handleChange}>
          <option disabled value="default"> -- Select -- </option>
          {this.renderOptions()}
        </Form.Control>
      </FormGroup>
    )
  }
}

class EnterAmount extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    if (this.props.currentStep !== 2) {
      return null
    }
    return(
      <FormGroup>
        <h5>Enter BTC Amount</h5>
        <FormControl
          id="amountBtc"
          name="amountBtc"
          type="number"
          placeholder="Amount"
          max={utils.satToBtc(this.props.satoshis)}
          defaultValue={utils.satToBtc(this.props.satoshis)}
          onChange={this.props.handleChange}
        />
      </FormGroup>
    )
  }
}

class Confirm extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    if (this.props.currentStep !== 3) {
      return null
    }
    return(
      <FormGroup>
        <h5>Confirm & Pay</h5>
        <FormGroup>
          <ListGroup>
              <ListGroupItem>Strike price: <strong>{this.props.strikePrice} DAI/BTC</strong></ListGroupItem>
              <ListGroupItem>Expiry: <strong>{new Date(this.props.expiry*1000).toLocaleString()}</strong></ListGroupItem>
              <ListGroupItem>Purchase amount: <strong>{this.props.satoshis} SAT ({utils.satToBtc(this.props.satoshis)} BTC)</strong></ListGroupItem>
              <ListGroupItem>Premium to pay: <strong>{utils.calculatePremium(this.props.satoshis, this.props.premium)} DAI</strong></ListGroupItem>
              <ListGroupItem>Options received: <strong>{utils.calculateInsure(this.props.satoshis, this.props.strikePrice)} XOPT</strong></ListGroupItem>
              <ListGroupItem>Seller: <strong>{this.props.seller}</strong></ListGroupItem>
          </ListGroup>
        </FormGroup>
        <SpinButton spinner={this.props.spinner}/>
      </FormGroup>
    )
  }
}

export class Buy extends React.Component {

  constructor(props) {
    super(props)
    this._next = this._next.bind(this)
    this._prev = this._prev.bind(this)
    this.state = {
      currentStep: 1,
      seller: '',
      satoshis: 0,
      optionContract: null,
      expiry: 0,
      premium: 0,
      strikePrice: 0,
      spinner: false,
    }

    this.handleChange = this.handleChange.bind(this)
    this.updateSatoshis = this.updateSatoshis.bind(this)
  }

  async componentDidMount() {
    if (this.props.signer) {
      const contract = this.props.contract;

      let contracts = this.props.contracts;
      let optionContract = contracts.attachOption(contract);
      let [expiry, premium, strikePrice, totalSupply, totalSupplyLocked, totalSupplyUnlocked] = await optionContract.getDetails();

      this.setState({
        optionContract: optionContract,
        expiry: expiry,
        premium: utils.weiDaiToBtc(premium),
        strikePrice: utils.weiDaiToBtc(strikePrice),
      });
    }
  }

  // Use the submitted data to set the state
  handleChange(event) {
    let {name, value} = event.target
    if(name == "amountBtc") {
      value = utils.btcToSat(value);
      this.setState({
        satoshis: utils.round(value),
      });
    } else {
      this.setState({
        [name]: value
      });
    }
  }

  updateSatoshis(i) {
    this.setState({
      satoshis: utils.round(i),
    });
  }
  
  // Trigger an alert on form submission
  handleSubmit = async (event) => {
    event.preventDefault();
    this.setState({spinner: true});
    const { seller, satoshis, optionContract } = this.state;
    try {
      let contracts = this.props.contracts;
      await contracts.checkAllowance();
      await contracts.insureOption(optionContract.address, seller, satoshis);
      this.props.history.push("/dashboard")
      showSuccessToast(this.props.toast, 'Successfully purchased option!', 3000);
    } catch(error) {
      console.log(error);
      showFailureToast(this.props.toast, 'Failed to send transaction...', 3000);
    }
    this.setState({spinner: false});
  }

  _next() {
    let currentStep = this.state.currentStep
    // If the current step is 1 or 2, then add one on "next" button click
    currentStep = currentStep >= 2? 3: currentStep + 1
    this.setState({
      currentStep: currentStep
    })
  }
    
  _prev() {
    let currentStep = this.state.currentStep
    // If the current step is 2 or 3, then subtract one on "previous" button click
    currentStep = currentStep <= 1? 1: currentStep - 1
    this.setState({
      currentStep: currentStep
    })
  }

  get previousButton(){
    let currentStep = this.state.currentStep;
    // If the current step is not 1, then render the "previous" button
    if(currentStep!==1){
      return (
        <button 
          className="btn btn-secondary float-left" 
          type="button" onClick={this._prev}>
        Previous
        </button>
      )
    }
    // ...else return nothing
    return null;
  }
  
  get nextButton(){
    let currentStep = this.state.currentStep;
    // If the current step is not 3, then render the "next" button
    if(currentStep<3){
      return (
        <button 
          className="btn btn-primary float-right" 
          type="button" onClick={this._next}>
        Next
        </button>        
      )
    }
    // ...else render nothing
    return null;
  }
  
  render() {
    return (
      <Container>
        <Modal.Header closeButton>
          <Modal.Title id="contained-modal-title-vcenter">
              Buy Option
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={this.handleSubmit}>
            <SelectSeller 
              currentStep={this.state.currentStep} 
              handleChange={this.handleChange}
              updateSatoshis={this.updateSatoshis}
              seller={this.state.seller}
              satoshis={this.state.satoshis}
              strikePrice={this.state.strikePrice}
              optionContract={this.state.optionContract}
            />
            <EnterAmount 
              currentStep={this.state.currentStep} 
              handleChange={this.handleChange}
              satoshis={this.state.satoshis}
            />
            <Confirm
              currentStep={this.state.currentStep} 
              handleChange={this.handleChange}
              seller={this.state.seller}
              satoshis={this.state.satoshis}
              premium={this.state.premium}
              strikePrice={this.state.strikePrice}
              expiry={this.state.expiry}
              spinner={this.state.spinner}
            />
          </Form>
        </Modal.Body>
        <Modal.Footer>
          {this.previousButton}
          {this.nextButton}
        </Modal.Footer>
      </Container>
    )
  }
}

export default withRouter(Buy);