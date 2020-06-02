import React, { Component } from "react";
import { Col, Container, Row, Form, Button, Modal, FormGroup } from "react-bootstrap";
import { ethers } from 'ethers';
import QRCode from "react-qr-code";
import * as utils from '../utils/utils.js';
import { showSuccessToast, showFailureToast } from '../controllers/toast';
import { withRouter } from 'react-router-dom';

class SelectSeller extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            loaded: false,
            sellers: [],
            options: [],
        };
    }

    async componentDidMount() {
        if (this.props.contract && this.props.contracts && !this.state.loaded) {
            // load the option contract
            let optionContract = this.props.contracts.attachOption(this.props.contract);
            // get the seller and options denoted in a amount of satoshi
            let [sellers, options] = await optionContract.getOptionOwnersFor(this.props.address);
            console.log(options);
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
            // convert the satoshi amount into a BTC amount
            let amountBtc = utils.satToBtc(utils.newBig(this.state.options[index].toString()));
            let addressShow = address.substr(0, 10) + '...';

            return (
                <option key={address} value={address} onClick={() => this.props.updateAmount(amountBtc)}>{amountBtc.toString()} BTC (Seller: {addressShow})</option>
            );
        })
    }

    render() {
        if (this.props.currentStep !== 1) { // Prop: The current step
            return null
        }
        return (
            <FormGroup>
                <h5>Please select your position.</h5>
                <Form.Control as="select" name="seller" defaultValue="default" onChange={this.props.handleChange}>
                    <option disabled value="default"> -- Select -- </option>
                    {this.renderOptions()}
                </Form.Control>
                <br></br>
                <p>
                    If you have purchased the same option from multiple sellers, you need to select a seller from the list.
                    <i> We currently only support exercising one position at a time.</i>
                </p>
            </FormGroup>
        )
    }
}

class ScanBTC extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            loaded: false,
            paymentUri: ''
        };
    }

    async componentDidUpdate() {
        if (this.props.contract && this.props.contracts && this.props.seller && !this.state.loaded) {
            let optionContract = this.props.contracts.attachOption(this.props.contract);
            let btcAddressRaw = await optionContract.getBtcAddress(this.props.seller);
            let btcAddress = ethers.utils.toUtf8String(ethers.utils.hexlify(btcAddressRaw));

            let paymentUri = "bitcoin:" + btcAddress + "?amount=" + this.props.amount;

            this.setState({
                loaded: true,
                paymentUri: paymentUri
            });
        }
    }

    render() {
        if (this.props.currentStep !== 2) {
            return null
        }
        return (
            <FormGroup>
                <Row className="justify-content-md-center">
                    <Col md="auto" className="text-center">
                        <p>To exercise the option, please make the following Bitcoin payment</p>
                        <QRCode value={this.state.paymentUri} />
                    <p>
                      Show detail: how much dai in return, BTC address, BTC amount etc.
                    </p>
                    </Col>
                </Row>
            </FormGroup>
        )
    }
}

class SubmitProof extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            progress: 0
        }
    }

    componentDidMount() {
        let proofCountdown = setInterval(() => {
            this.setState({
                progress: this.state.progress + 10
            })
            if (this.state.progress >= 100) clearInterval(proofCountdown);
        }, 1000);
    }

    componentDidUpdate() {
        if (this.state.progress >= 100) {

        }
    }

    render() {
        if (this.props.currentStep !== 3) {
            return null
        }
        return (
            <div>
                <h4>Please enter the transaction id of your Bitcoin payment.</h4>
                <p>We will track it for you and tell you when it is ready!</p>
                <Form.Group>
                    <Form.Label>Transaction ID</Form.Label>
                    <Form.Control required name="txid" type="text" onChange={this.props.handleChange} />
                </Form.Group>
                <button type="submit" className="btn btn-success btn-block">Exercise</button>
            </div>
        )
    }
}

/*
<FormGroup>
    <h5>Alternatively, you can submit the proof yourself:</h5>
    <Form.Group>
        <Form.Label>BlockHeight</Form.Label>
        <Form.Control name="height" type="number" onChange={this.props.handleChange} />
    </Form.Group>
    <Form.Group>
        <Form.Label>Transaction Index</Form.Label>
        <Form.Control name="index" type="text" onChange={this.props.handleChange} />
    </Form.Group>
    <Form.Group>
        <Form.Label>Transaction ID</Form.Label>
        <Form.Control name="txid" type="text" onChange={this.props.handleChange} />
    </Form.Group>
    <Form.Group>
        <Form.Label>Proof</Form.Label>
        <Form.Control name="proof" type="text" onChange={this.props.handleChange} />
    </Form.Group>
    <Form.Group>
        <Form.Label>Raw Tx</Form.Label>
        <Form.Control name="rawtx" type="text" onChange={this.props.handleChange} />
    </Form.Group>
    <button disabled={this.state.progress < 100} className="btn btn-success btn-block">Exercise</button>
</FormGroup>
*/

class ExerciseWizard extends Component {

    constructor(props) {
        super(props);
        this.state = {
            purchasedLoaded: false,
            purchasedOptions: [],
            totalInsured: 0,
            insuranceAvailable: 0,
            paidPremium: 0,
            totalIncome: utils.newBig(0),
            showExercise: false,
            currentStep: 1,
            amount: 0,
            height: 0,
            index: 0,
            seller: "",
            txid: null,
            proof: null,
            rawtx: null,
        };

        this.handleChange = this.handleChange.bind(this)
        this.updateAmount = this.updateAmount.bind(this)
    }

    handleChange(event) {
        const { name, value } = event.target;
        this.setState({
            [name]: value
        });
    }

    store

    updateAmount(i) {
        this.setState({
            amount: i
        });
    }

    isValid(step) {
        if (step == 0 && this.state.seller == "") {
            return false;
        }
        return true;
    }

    handleSubmit = async (event) => {
        event.preventDefault();
        let currentStep = this.state.currentStep;
        if (currentStep <= 2) {
            if (!this.isValid(currentStep-1)) return;
            this.setState({currentStep: currentStep + 1});
            return;
        }
        // store txid to local storage
        // store a mapping of the option to the txid
        const { seller, height, index, txid, proof, rawtx } = this.state;
        try {
            // This is mocked. BTC-Relay connection works, but querying proof in backend is still WIP.
            await this.props.contracts.exerciseOption(this.props.contract, seller, 1000, 1, "0xe91669bf43109bbd3ed730d8a5ebdc691b5d7482d2cf034c7a0db12023db8e5f", "0x00", "0x00");
            showSuccessToast(this.props.toast, 'Exercise successful!', 3000);
            this.props.hide();
            this.forceUpdate();
        } catch (error) {
            console.log(error);
            showFailureToast(this.props.toast, 'Failed to send transaction...', 3000);
        }
    }

    cancelExercise() {
        this.setState({
            currentStep: 1,
            exerciseOption: {},
            showExercise: false
        });
    }

    _next() {
        let currentStep = this.state.currentStep;
        if (!this.isValid(currentStep-1)) return;
        // If the current step is 1 or 2, then add one on "next" button click
        currentStep = currentStep >= 2 ? 3 : currentStep + 1;
        this.setState({
            currentStep: currentStep
        })
    }

    _prev() {
        let currentStep = this.state.currentStep
        // If the current step is 2 or 3, then subtract one on "previous" button click
        currentStep = currentStep <= 1 ? 1 : currentStep - 1
        this.setState({
            currentStep: currentStep
        })
    }

    get previousButton() {
        let currentStep = this.state.currentStep;
        if (currentStep !== 1) {
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
        let currentStep = this.state.currentStep;
        if (currentStep < 3) {
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

    render() {
        return (
            <Container>
                <Modal.Header closeButton>
                    <Modal.Title id="contained-modal-title-vcenter">
                        Exercise Option
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form onSubmit={this.handleSubmit}>
                        <SelectSeller
                            currentStep={this.state.currentStep}
                            handleChange={this.handleChange}
                            seller={this.state.seller}
                            amount={this.state.amount}
                            updateAmount={this.updateAmount}
                            contract={this.props.contract}
                            contracts={this.props.contracts}
                            signer={this.props.signer}
                            address={this.props.address}
                        />
                        <ScanBTC
                            currentStep={this.state.currentStep}
                            handleChange={this.handleChange}
                            updateAmount={this.updateAmount}
                            contract={this.props.contract}
                            contracts={this.props.contracts}
                            signer={this.props.signer}
                            seller={this.state.seller}
                            amount={this.state.amount}
                        />
                        <SubmitProof
                            currentStep={this.state.currentStep}
                            handleChange={this.handleChange}
                            seller={this.state.seller}
                        />
                    </Form>
                </Modal.Body>
                <Modal.Footer>
                    {this.previousButton}
                    {this.nextButton}
                    <Button variant="danger" onClick={() => this.props.hide()}>Cancel</Button>
                </Modal.Footer>
            </Container>
        )
    }
}

export default withRouter(ExerciseWizard);
