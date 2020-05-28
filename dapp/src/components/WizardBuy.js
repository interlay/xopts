import React from "react";
import { ToastContainer, toast } from 'react-toastify';
import { Container, ListGroup, ListGroupItem, Form, FormGroup, FormControl, Modal } from "react-bootstrap";
import * as utils from '../utils/utils.js'; 
import { showSuccessToast, showFailureToast } from '../controllers/toast';

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
      let amount = utils.weiDaiToDai(parseInt(this.state.options[index]._hex));
      let amountBtc = amount / this.props.strikePrice;
      return (
        <option key={address} value={address} onClick={() => this.props.updateAmount(amount)}>{address} - {amountBtc}</option>
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
          id="amount"
          name="amount"
          type="number"
          placeholder="Amount"
          max={this.props.amount}
          defaultValue={this.props.amount}
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
              <ListGroupItem>{this.props.seller}</ListGroupItem>
              <ListGroupItem>{this.props.amount} SAT ({utils.satToBtc(this.props.amount)} BTC)</ListGroupItem>
              <ListGroupItem>{calculatePremium(this.props.amount, this.props.premium)} DAI</ListGroupItem>
              <ListGroupItem>{utils.weiDaiToBtc(calculateOptions(this.props.amount, this.props.strikePrice))} XOPT</ListGroupItem>
          </ListGroup>
        </FormGroup>
        <button className="btn btn-success btn-block">Pay</button>
      </FormGroup>
    )
  }
}

function calculatePremium(amount, premium) {
  return utils.satToBtc(amount) * premium;
}

function calculateOptions(amount, strikePrice) {
  return amount * strikePrice;
}

export default class Buy extends React.Component {

  constructor(props) {
    super(props)
    this._next = this._next.bind(this)
    this._prev = this._prev.bind(this)
    this.state = {
      currentStep: 1,
      seller: '',
      amount: 0,
      optionContract: null,
      expiry: 0,
      premium: 0,
      strikePrice: 0,
      redirectToReferrer: false,
    }

    this.handleChange = this.handleChange.bind(this)
    this.updateAmount = this.updateAmount.bind(this)
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
        premium: utils.weiDaiToBtc(parseInt(premium._hex)),
        strikePrice: utils.weiDaiToBtc(parseInt(strikePrice._hex)),
      });
    }
  }

  // Use the submitted data to set the state
  handleChange(event) {
    let {name, value} = event.target
    if(name == "amount"){
      value = utils.btcToSat(value);
    }
    this.setState({
      [name]: value
    });
  }

  updateAmount(i) {
    this.setState({
      amount: i
    });
  }
  
  // Trigger an alert on form submission
  handleSubmit = async (event) => {
    event.preventDefault();
    const { seller, amount, optionContract, premium } = this.state;
    let tokensToPay = utils.daiToWeiDai(calculatePremium(amount, premium));
    try {
      let contracts = this.props.contracts;
      await contracts.checkAllowance();
      await contracts.insureOption(optionContract.address, seller, tokensToPay.toString());
      showSuccessToast(toast, 'Successfully purchased option!', 3000);
      this.props.hide();
    } catch(error) {
      console.log(error);
      showFailureToast(toast, 'Failed to send transaction...', 3000);
    }
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

          <ToastContainer
            position="bottom-center"
            autoClose={5000}
            hideProgressBar={false}
            newestOnTop={false}
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
          />
          <Form onSubmit={this.handleSubmit}>
            <SelectSeller 
              currentStep={this.state.currentStep} 
              handleChange={this.handleChange}
              updateAmount={this.updateAmount}
              seller={this.state.seller}
              amount={this.state.amount}
              strikePrice={this.state.strikePrice}
              optionContract={this.state.optionContract}
            />
            <EnterAmount 
              currentStep={this.state.currentStep} 
              handleChange={this.handleChange}
              amount={this.state.amount}
            />
            <Confirm
              currentStep={this.state.currentStep} 
              handleChange={this.handleChange}
              seller={this.state.seller}
              amount={this.state.amount}
              premium={this.state.premium}
              strikePrice={this.state.strikePrice}
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