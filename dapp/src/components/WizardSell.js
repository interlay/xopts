import React from "react";
import { ethers } from 'ethers';
import { Redirect } from "react-router-dom";
import optionArtifact from "../artifacts/PutOption.json"
import ierc20Artifact from "../artifacts/IERC20.json"
import { ToastContainer, toast } from 'react-toastify';
import { Container, ListGroup, ListGroupItem, Form, FormGroup, FormControl, Modal } from "react-bootstrap";

class EnterAmount extends React.Component {
  render() {
    if (this.props.currentStep !== 1) {
      return null
    }
    return(
      <FormGroup>
        <h5>Enter Amount (DAI)</h5>
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
        <h5>Enter BTC Address</h5>
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
              <ListGroupItem>{this.props.amount} DAI -> {this.props.amount} XOPT</ListGroupItem>
          </ListGroup>
        </FormGroup>
        <button className="btn btn-success btn-block">Pay</button>
      </FormGroup>
    )
  }
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
      optionContract: null,
      redirectToReferrer: false,
    }

    this.handleChange = this.handleChange.bind(this)
  }

  async componentDidMount() {
    if (this.props.signer) {
      const contract = this.props.contract;

      let erc20Abi = ierc20Artifact.abi;
      let erc20Contract = new ethers.Contract(this.props.erc20Address, erc20Abi, this.props.signer);

      let optionAbi = optionArtifact.abi;
      let optionContract = new ethers.Contract(contract, optionAbi, this.props.signer);

      this.setState({
        erc20Contract: erc20Contract,
        optionContract: optionContract,
      });
    }
  }

  handleChange(event) {
    const {name, value} = event.target
    this.setState({
      [name]: value
    });
  }
  
  handleSubmit = async (event) => {
    event.preventDefault();
    const { amount, btcAddress, optionContract, erc20Contract } = this.state;
    try {
      await erc20Contract.approve(optionContract.address, amount);
      await optionContract.underwrite(amount, btcAddress);
    } catch(error) {
      console.log(error);
      toast.error('Failed to send transaction...', {
        position: "bottom-center",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
      });
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
              Buy Options
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