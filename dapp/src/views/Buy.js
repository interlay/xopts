import React from "react";
import { ethers } from 'ethers';
import { Redirect } from "react-router-dom";
import optionArtifact from "../artifacts/PutOption.json"
import ierc20Artifact from "../artifacts/IERC20.json"
import { ToastContainer, toast } from 'react-toastify';
import { Container, ListGroup, ListGroupItem, FormGroup, FormControl } from "react-bootstrap";

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
      let amount = this.state.options[index].toNumber();
      return (
        <option key={address} value={address} onClick={() => this.props.updateAmount(amount)}>{address} - {amount}</option>
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
        <select name="seller" defaultValue="default" onChange={this.props.handleChange}>
          <option disabled value="default"> -- Select -- </option>
          {this.renderOptions()}
        </select>
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
        <h5>Enter Amount (BTC)</h5>
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
              <ListGroupItem>{this.props.amount} BTC</ListGroupItem>
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
      seller: '',
      amount: 0,
      optionContract: null,
      erc20Contract: null,
      redirectToReferrer: false,
    }

    this.handleChange = this.handleChange.bind(this)
    this.updateAmount = this.updateAmount.bind(this)
  }

  async componentDidMount() {
    if (this.props.eth.signer) {
      const { contract } = this.props.match.params;

      let optionAbi = optionArtifact.abi;
      let optionContract = new ethers.Contract(contract, optionAbi, this.props.eth.signer);

      let erc20Abi = ierc20Artifact.abi;
      let erc20Contract = new ethers.Contract(this.props.eth.erc20Address, erc20Abi, this.props.eth.signer);

      this.setState({
        optionContract: optionContract,
        erc20Contract: erc20Contract,
      });
    }
  }

  // Use the submitted data to set the state
  handleChange(event) {
    const {name, value} = event.target
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
    const { seller, amount, optionContract, erc20Contract } = this.state;
    try {
      await erc20Contract.approve(optionContract.address, amount);
      await optionContract.insure(amount, seller);
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
      return;
    }

    this.setState({
      redirectToReferrer: true
    });
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
    const redirectToReferrer = this.state.redirectToReferrer;
    if (redirectToReferrer === true) {
        return <Redirect to="/home" />
    }
    // if(!this.state.eth) return <Redirect to="/"/>    
    return (
      <Container className="p-3">
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
        <div className="container-fluid" style={{marginTop: 10 + 'em'}}>
          <div className="mr-auto ml-auto col-md-6 col-12">
            <div className="wizard-container">

              <h1>Buy Insurance</h1>
                
              <form onSubmit={this.handleSubmit}>
                <SelectSeller 
                  currentStep={this.state.currentStep} 
                  handleChange={this.handleChange}
                  updateAmount={this.updateAmount}
                  seller={this.state.seller}
                  amount={this.state.amount}
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
                />

                {this.previousButton}
                {this.nextButton}
              
              </form>
            </div>
          </div>
        </div>
      </Container>
    )
  }
}