import React from "react";
import { ethers } from 'ethers';
import optionSellableArtifact from "../artifacts/IERC20Sellable.json"
import ierc20Artifact from "../artifacts/IERC20.json"
import { ToastContainer, toast } from 'react-toastify';
import { Container, ListGroup, ListGroupItem, Form, FormGroup, FormControl, Modal } from "react-bootstrap";
import * as utils from '../utils/utils.js'; 

class EnterAmount extends React.Component {
  render() {
    if (this.props.currentStep !== 1) {
      return null
    }
    return(
      <FormGroup>
        <h5>How much DAI do you want to underwrite (insurance collateral)?</h5>
        <FormControl
          id="amount"
          name="amount"
          type="number"
          defaultValue="0"
          onChange={this.props.handleChange}
        />
      </FormGroup>
    )
  }
}

class EnterAddress extends React.Component {
  render() {
    if (this.props.currentStep !== 2) {
      return null
    }
    return(
      <FormGroup>
        <h5>Enter your BTC Address</h5>
        <input
          className="form-control"
          id="btcAddress"
          name="btcAddress"
          type="text"
          placeholder="BTC Address"
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
              <ListGroupItem>{this.props.btcAddress}</ListGroupItem>
              <ListGroupItem>{utils.weiDaiToDai(this.props.amount)} DAI -> {utils.weiDaiToDai(this.props.amount)} XOPT</ListGroupItem>
          </ListGroup>
        </FormGroup>
        <button className="btn btn-success btn-block">Pay</button>
      </FormGroup>
    )
  }
}

function showSuccessToast(msg, ms) {
  toast.success(msg, {
    position: "top-center",
    autoClose: ms,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
    progress: undefined,
  });
}

function showFailureToast(msg, ms) {
  toast.error(msg, {
    position: "bottom-center",
    autoClose: ms,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
    progress: undefined,
  });
}

export default class Buy extends React.Component {

  constructor(props) {
    super(props)
    this._next = this._next.bind(this)
    this._prev = this._prev.bind(this)
    this.state = {
      currentStep: 1,
      amount: 0,
      address: '',
      erc20Contract: null,
      optionSellableContract: null,
    }

    this.handleChange = this.handleChange.bind(this)
  }

  async componentDidMount() {
    if (this.props.signer) {
      const contract = this.props.contract;

      let erc20Abi = ierc20Artifact.abi;
      let erc20Contract = new ethers.Contract(this.props.erc20Address, erc20Abi, this.props.signer);

      let optionAbi = optionSellableArtifact.abi;
      let optionSellableContract = new ethers.Contract(contract, optionAbi, this.props.signer);

      this.setState({
        erc20Contract: erc20Contract,
        optionSellableContract: optionSellableContract,
      });
    }
  }

  handleChange(event) {
    let {name, value} = event.target
    if(name == "amount"){
      value = utils.daiToWeiDai(value);
    }
    console.log(value);
    this.setState({
      [name]: value
    });
  }
  
  handleSubmit = async (event) => {
    event.preventDefault();
    const { amount, btcAddress, optionSellableContract, erc20Contract } = this.state;
    try {
      let tx = await erc20Contract.approve(optionSellableContract.address, amount.toString());
      showSuccessToast('Awaiting confirmations...', 15000);
      await tx.wait(1);
      tx = await optionSellableContract.underwrite(amount.toString(), ethers.utils.toUtf8Bytes(btcAddress));
      showSuccessToast('Awaiting confirmations...', 15000);
      await tx.wait(1);
      this.props.hide();
      showSuccessToast('Successfully sold options!', 3000);
    } catch(error) {
      console.log(error);
      showFailureToast('Failed to send transaction...', 3000);
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
              Sell Options
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
            <EnterAmount
              currentStep={this.state.currentStep} 
              handleChange={this.handleChange}
            />
            <EnterAddress
              currentStep={this.state.currentStep} 
              handleChange={this.handleChange}
            />
            <Confirm
              currentStep={this.state.currentStep} 
              handleChange={this.handleChange}
              amount={this.state.amount}
              btcAddress={this.state.btcAddress}
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