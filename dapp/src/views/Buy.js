import React, { Component, useState } from "react";
import { Button, Col, Container, Row, Table, Card, Form } from "react-bootstrap";
import { ethers } from 'ethers';
import { Redirect } from "react-router-dom";
import optionArtifact from "../artifacts/PutOption.json"
import ierc20Artifact from "../artifacts/IERC20.json"

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
    if (this.props.contract && !this.state.loaded) {
      let [sellers, options] = await this.props.contract.getOptionSellers();
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
      <div className="form-group">
        <h2>Select Seller</h2>
        <select name="seller" defaultValue="default" onChange={this.props.handleChange}>
          <option disabled value="default"> -- Select -- </option>
          {this.renderOptions()}
        </select>
      </div>
    )
  }
}

class ChooseAmount extends React.Component {
  constructor(props) {
    super(props);
  }

  render() {
    if (this.props.currentStep !== 2) {
      return null
    }
    return(
      <div className="form-group">
        <h2>Choose Amount</h2>
        <input
          className="form-control"
          id="amount"
          name="amount"
          type="number"
          placeholder="Amount"
          max={this.props.amount}
          value={this.props.amount}
          onChange={this.props.handleChange}
        />
      </div>
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
      <div className="form-group">
        <h2>Confirm & Pay</h2>
        <button className="btn btn-success btn-block">Pay</button>
      </div>
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
      contract: null,
      redirectToReferrer: false,
    }

    this.handleChange = this.handleChange.bind(this)
    this.updateAmount = this.updateAmount.bind(this)
  }

  async componentDidMount() {
    if (this.props.eth.provider) {
      const { contract } = this.props.match.params;

      let optionAbi = optionArtifact.abi;
      let optionContract = await new ethers.Contract(contract, optionAbi, this.props.eth.provider);
      // let [sellers, options] = await optionContract.getOptionSellers();
      this.setState({
        contract: optionContract,
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
    const { seller, amount, contract } = this.state;
    let erc20Abi = ierc20Artifact.abi;
    let erc20Address = "0x151eA753f0aF1634B90e1658054C247eFF1C2464";
    let optionAbi = optionArtifact.abi;
    try {
      let erc20Contract = await new ethers.Contract(erc20Address, erc20Abi, this.props.eth.signer);
      await erc20Contract.approve(contract.address, amount);
      let optionContract = await new ethers.Contract(contract.address, optionAbi, this.props.eth.signer);
      await optionContract.insure(amount, seller);
    } catch(error) {
      console.log(error)
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
    if(currentStep !==1){
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
    if(currentStep <3){
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
      <div className="buy-option-wizard">
        <h1>Purchase Insurance</h1>
          
        <form onSubmit={this.handleSubmit}>
          <SelectSeller 
            currentStep={this.state.currentStep} 
            handleChange={this.handleChange}
            updateAmount={this.updateAmount}
            seller={this.state.seller}
            amount={this.state.amount}
            contract={this.state.contract}
          />
          <ChooseAmount 
            currentStep={this.state.currentStep} 
            handleChange={this.handleChange}
            amount={this.state.amount}
            contract={this.state.contract}
          />
          <Confirm 
            currentStep={this.state.currentStep} 
            handleChange={this.handleChange}
          />

          {this.previousButton}
          {this.nextButton}
        
        </form>
      </div>
    )
  }
}