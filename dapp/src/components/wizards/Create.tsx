import React, { Component } from "react";
import { Col, ListGroup, ListGroupItem, Row, Form, Button, Modal, FormGroup } from "react-bootstrap";
import { ethers } from 'ethers';
import QRCode from "react-qr-code";
import * as utils from '../../utils/utils';
import { showSuccessToast, showFailureToast } from '../../controllers/toast';
import { pollAndUpdateConfirmations } from '../../utils/poll';
import { AppProps } from "../../types/App";
import { Big } from 'big.js';
import { FormControlElement } from "../../types/Inputs";
import { Option } from "../../types/Storage";
import { SpinButton } from "../SpinButton";
import { BigNumber } from "ethers/utils";

interface InputDetailsProps extends AppProps {
    currentStep: number
    expiryDate: string
    expiryTime: string
    premium: string
    strikePrice: string
    handleChange: (event: React.ChangeEvent<FormControlElement>) => void
}

interface InputDetailsState {
    loaded: boolean
}

class InputDetails extends Component<InputDetailsProps, InputDetailsState> {
    state: InputDetailsState = {
        loaded: false,
    }

    async componentDidMount() {
    }

    render() {
        if (this.props.currentStep !== 1) {
            return null
        }
        return (
            <React.Fragment>
                <Form.Group>
                    <Form.Label>Expiry</Form.Label>
                    <Form.Control
                        name="expiryDate"
                        type="date"
                        onChange={this.props.handleChange}
                        value={this.props.expiryDate}
                        className="mb-2"
                        required
                    />
                    <Form.Control
                        name="expiryTime"
                        type="time"
                        onChange={this.props.handleChange}
                        value={this.props.expiryTime}
                        required
                    />
                    <Form.Text className="text-muted">
                        The date and time when the contract will expire.
                    </Form.Text>
                </Form.Group>

                <Form.Group>
                    <Form.Label>Premium</Form.Label>
                    <Form.Control
                        name="premium"
                        type="number"
                        placeholder="Premium"
                        onChange={this.props.handleChange}
                        value={this.props.premium}
                        required
                    />
                    <Form.Text className="text-muted">
                        The premium in DAI per BTC.
                    </Form.Text>
                </Form.Group>

                <Form.Group>
                    <Form.Label>Strike Price</Form.Label>
                    <Form.Control
                        name="strikePrice"
                        type="number"
                        placeholder="Strike Price"
                        onChange={this.props.handleChange}
                        value={this.props.strikePrice}
                        required
                    />
                    <Form.Text className="text-muted">
                        The return in DAI per BTC.
                    </Form.Text>
                </Form.Group>
            </React.Fragment>
        )
    }
}

interface ConfirmProps {
    currentStep: number
    spinner: boolean
    expiryDate: string
    expiryTime: string
    premium: string
    strikePrice: string
}

function premiumInBTCToSat(amount: number) {
    let weiDai = utils.daiToWeiDai(utils.newBig(amount));
    return weiDai.div(utils.btcToSat(utils.newBig(1)));
}

function strikePriceInBTCToSat(amount: number) {
    let weiDai = utils.daiToWeiDai(utils.newBig(amount));
    return weiDai.div(utils.btcToSat(utils.newBig(1)));
}

class Confirm extends Component<ConfirmProps> {
    render() {
        const date = new Date(this.props.expiryDate + " " + this.props.expiryTime);
        if (this.props.currentStep !== 2) {
            return null
        }
        return (
            <FormGroup>
            <h5>Confirm</h5>
            <FormGroup>
              <ListGroup>
                  <ListGroupItem>Expiry: <strong>{date.toString()}</strong></ListGroupItem>
                  <ListGroupItem>Premium: <strong>{this.props.premium} DAI/BTC</strong></ListGroupItem>
                  <ListGroupItem>Strike Price: <strong>{this.props.strikePrice} DAI/BTC</strong></ListGroupItem>
              </ListGroup>
            </FormGroup>
            <SpinButton text="Create" spinner={this.props.spinner}/>
          </FormGroup>
    
        )
    }
}

interface CreateWizardProps extends AppProps {
    toast: any
    hideModal: () => void
    showModal: boolean
    reloadOptions: () => void
}

interface CreateWizardState {
    currentStep: number
    spinner: boolean
    expiryDate: string
    expiryTime: string
    premium: string
    strikePrice: string
}

export default class CreateWizard extends Component<CreateWizardProps, CreateWizardState> {
    state: CreateWizardState = {
        currentStep: 1,
        spinner: false,
        expiryDate: '',
        expiryTime: '',
        premium: '',
        strikePrice: '',
    }

    constructor(props: CreateWizardProps) {
        super(props);

        this.handleChange = this.handleChange.bind(this)
        this.exitModal = this.exitModal.bind(this);
    }

    handleChange(event: React.ChangeEvent<FormControlElement>) {
        const { name, value } = event.target;
        console.log(name, value)
        this.setState(state => ({
            ...state,
            [name]: value
        }));
    }

    isValid() {
        const { expiryDate, expiryTime, premium, strikePrice } = this.state;
        return [expiryDate, expiryTime, premium, strikePrice].filter((value => {
            return value === "";
        })).length === 0
    }

    handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        let currentStep = this.state.currentStep;
        if (currentStep < 2) {
          if (!this.isValid()) return;
          this.setState({currentStep: 2});
          return;
        }
    
        this.setState({spinner: true});
        const { expiryDate, expiryTime, premium, strikePrice } = this.state;
        const date = new Date(expiryDate + " " + expiryTime);
        const unix = date.getTime() / 1000;

        const premiumPerSat = new BigNumber(premiumInBTCToSat(parseInt(premium)).toString())
        const strikePricePerSat = new BigNumber(strikePriceInBTCToSat(parseInt(strikePrice)).toString())

        try {
            let contracts = this.props.contracts;
            await contracts.createOption(unix, premiumPerSat, strikePricePerSat);
            showSuccessToast(this.props.toast, 'Successfully created option!', 3000);
            this.exitModal();
            this.props.reloadOptions();
        } catch(error) {
            console.log(error);
            showFailureToast(this.props.toast, 'Failed to create option.', 3000);
            this.setState({spinner: false});
        }
    
    }

    _next() {
        let step = this.state.currentStep;
        if (!this.isValid()) return;
        step = step > 1 ? 2 : step + 1;
        this.setState({
            currentStep: step
        })
    }

    _prev() {
        let step = this.state.currentStep
        step = step <= 1 ? 1 : step - 1
        this.setState({
            currentStep: step
        })
    }

    get previousButton() {
        let step = this.state.currentStep;
        if (step !== 1) {
            return (
                <button
                    className="btn btn-secondary float-left"
                    type="button" onClick={() => this._prev()}>
                    Previous
                </button>
            )
        }
        return null;
    }

    get nextButton() {
        let step = this.state.currentStep;
        if (step < 2) {
            return (
                <button
                    className="btn btn-primary float-right"
                    type="button" onClick={() => this._next()}>
                    Next
                </button>
            )
        }
        return null;
    }

    exitModal() {
        this.props.hideModal();
        this.setState({currentStep: 1});
    }

    render() {
        return (
            <Modal
                size="lg"
                aria-labelledby="contained-modal-title-vcenter"
                centered
                show={this.props.showModal} onHide={() => this.exitModal()}>
                <Modal.Header closeButton>
                    <Modal.Title id="contained-modal-title-vcenter">
                        Create Option
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form onSubmit={this.handleSubmit}>
                        <InputDetails
                            currentStep={this.state.currentStep}
                            expiryDate={this.state.expiryDate}
                            expiryTime={this.state.expiryTime}
                            premium={this.state.premium}
                            strikePrice={this.state.strikePrice}
                            handleChange={this.handleChange}
                            {...this.props}
                        />
                        <Confirm
                            currentStep={this.state.currentStep}
                            spinner={this.state.spinner}
                            expiryDate={this.state.expiryDate}
                            expiryTime={this.state.expiryTime}
                            premium={this.state.premium}
                            strikePrice={this.state.strikePrice}
                        />

                    </Form>
                </Modal.Body>
                <Modal.Footer>
                    {this.previousButton}
                    {this.nextButton}
                    <Button variant="danger" onClick={() => this.exitModal()}>Cancel</Button>
                </Modal.Footer>
            </Modal>
        )
    }
}