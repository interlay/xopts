import React, { Component } from "react";
import { Container, ListGroup, ListGroupItem, Form, FormGroup, FormControl, Modal } from "react-bootstrap";
import * as utils from '../../utils/utils';
import { showSuccessToast, showFailureToast } from '../../controllers/toast';
import { SpinButton } from '../SpinButton';
import { AppProps } from "../../types/App";
import { Big } from 'big.js';
import { FormControlElement } from "../../types/Inputs";
import { OptionInterface } from "../../types/Contracts";

interface EnterAmountProps {
  currentStep: number
  handleChange: (event: React.ChangeEvent<FormControlElement>) => void,
  amountDai: Big
}

interface EnterAmountState {
  amountDai: number
}

class EnterAmount extends Component<EnterAmountProps, EnterAmountState> {
  state: EnterAmountState = {
    amountDai: 0,
  }

  constructor(props: EnterAmountProps) {
    super(props);
    this.state = {
      amountDai: parseInt(this.props.amountDai.toString()),
    }

    this.handleChange = this.handleChange.bind(this);
  }

  handleChange(event: React.ChangeEvent<FormControlElement>) {
    let {name, value} = event.target
    this.setState(state => ({
      ...state,
      [name]: value
    }));
    this.props.handleChange(event);
  }

  render() {
    if (this.props.currentStep !== 1) {
      return null
    }
    return(
      <FormGroup>
        <h5>How much DAI do you want to underwrite (insurance collateral)?</h5>
        <FormControl
          id="amountDai"
          name="amountDai"
          type="number"
          value={this.props.amountDai.toString()}
          isInvalid={this.state.amountDai <= 0}
          onChange={this.handleChange}
        />
      </FormGroup>
    )
  }
}

interface EnterAddressProps {
  currentStep: number
  handleChange: (event: React.ChangeEvent<FormControlElement>) => void,
  btcAddress: string
}

class EnterAddress extends Component<EnterAddressProps> {
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
          value={this.props.btcAddress || ''}
          onChange={this.props.handleChange}
          required
        />
      </FormGroup>
    )
  }
}

interface ConfirmProps {
  currentStep: number
  strikePrice: Big
  expiry: number
  amountDai: Big
  btcAddress: string
  spinner: boolean
}

class Confirm extends Component<ConfirmProps> {
  render() {
    if (this.props.currentStep !== 3) {
      return null
    }
    return(
      <FormGroup>
        <h5>Confirm & Pay</h5>
        Note: you will <strong>not</strong> be able to withdraw your DAI until the option expires.
        <FormGroup>
          <ListGroup>
              <ListGroupItem>Strike Price: <strong>{this.props.strikePrice.toString()} DAI</strong></ListGroupItem>
              <ListGroupItem>Expiry: <strong>{new Date(this.props.expiry*1000).toLocaleString()}</strong></ListGroupItem>
              <ListGroupItem>Amount: <strong>{this.props.amountDai.toString()} DAI -&gt; {this.props.amountDai.toString()} XOPT</strong></ListGroupItem>
              <ListGroupItem>Underwrites: <strong>{utils.calculateAvailableBTC(this.props.amountDai, this.props.strikePrice).toString()} BTC</strong></ListGroupItem>
              <ListGroupItem>BTC Address: <strong>{this.props.btcAddress}</strong></ListGroupItem>
          </ListGroup>
        </FormGroup>
        <SpinButton spinner={this.props.spinner}/>
      </FormGroup>
    )
  }
}

interface SellWizardProps extends AppProps {
  contract: string
  toast: any
  hide: () => void
}

interface SellWizardState {
  currentStep: number
  amountDai: Big
  btcAddress: string
  optionContract?: OptionInterface
  spinner: boolean
  expiry: number
  strikePrice: Big
}

export default class SellWizard extends Component<SellWizardProps> {
  state: SellWizardState = {
    currentStep: 1,
    amountDai: utils.newBig(1),
    btcAddress: '',
    spinner: false,
    expiry: 0,
    strikePrice: utils.newBig(0),
  }

  constructor(props: SellWizardProps) {
    super(props)
    this._next = this._next.bind(this)
    this._prev = this._prev.bind(this)

    this.handleChange = this.handleChange.bind(this)
  }

  async componentDidMount() {
    const contract = this.props.contract;

    let contracts = this.props.contracts;
    let optionContract = contracts.attachOption(contract);
    let {expiry, strikePrice} = await optionContract.getDetails();

    this.setState({
      optionContract: optionContract,
      expiry: parseInt(expiry.toString()),
      strikePrice: utils.weiDaiToBtc(utils.newBig(strikePrice.toString())),
    });
  }

  handleChange(event: React.ChangeEvent<FormControlElement>) {
    let {name, value} = event.target
    if (name === "amountDai") {
      this.setState({
        amountDai: utils.newBig(value || 0)
      });
    } else {
      this.setState({
        [name]: value
      });
    }
  }

  isValid(step: number) {
    const { amountDai, btcAddress } = this.state;
    let valid = [
      amountDai.gt(0),
      btcAddress !== "",
      true,
    ];
    return valid[step];
  }

  handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    let currentStep = this.state.currentStep;
    if (currentStep <= 2) {
      if (!this.isValid(currentStep-1)) return;
      this.setState({currentStep: currentStep + 1});
      return;
    }

    const { amountDai, btcAddress, optionContract } = this.state;

    try {
      let dai = await this.props.contracts.balanceOf();
      if (amountDai.gt(dai.toString())) {
        showFailureToast(this.props.toast, 'Insufficient collateral!', 3000);
        return;
      }
    } catch(err) {
      showFailureToast(this.props.toast, 'Something went wrong...', 3000);
    }

    this.setState({spinner: true});
    try {
      let contracts = this.props.contracts;
      let weiDai = utils.daiToWeiDai(amountDai);
      await contracts.checkAllowance(weiDai);
      if (optionContract) {
        await contracts.underwriteOption(optionContract.address, weiDai, btcAddress);
        //this.props.history.push("/positions")
        showSuccessToast(this.props.toast, 'Successfully sold options!', 3000);
      } else {
        throw Error("Options contract not found.");
      }
    } catch(error) {
      console.log(error);
      showFailureToast(this.props.toast, 'Failed to send transaction...', 3000);
      this.setState({spinner: false});
    }
  }

  _next() {
    let currentStep = this.state.currentStep;
    if (!this.isValid(currentStep-1)) return;
    // If the current step is 1 or 2, then add one on "next" button click
    currentStep = currentStep >= 2? 3: currentStep + 1;
    this.setState({
      currentStep: currentStep
    });
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
          <Form onSubmit={this.handleSubmit}>
            <EnterAmount
              currentStep={this.state.currentStep}
              handleChange={this.handleChange}
              amountDai={this.state.amountDai}
            />
            <EnterAddress
              currentStep={this.state.currentStep}
              handleChange={this.handleChange}
              btcAddress={this.state.btcAddress}
            />
            <Confirm
              currentStep={this.state.currentStep}
              amountDai={this.state.amountDai}
              btcAddress={this.state.btcAddress}
              spinner={this.state.spinner}
              expiry={this.state.expiry}
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