import React, { Component } from "react";
import { Col, ListGroup, ListGroupItem, Row, Form, Button, Modal, FormGroup } from "react-bootstrap";
import { ethers } from 'ethers';
import QRCode from "react-qr-code";
import * as utils from '../utils/utils';
import { showSuccessToast, showFailureToast } from '../controllers/toast';
import { withRouter } from 'react-router-dom';
import { pollAndUpdateConfirmations } from '../utils/poll';
import { AppProps } from "../types/App";
import { Big } from 'big.js';
import { FormControlElement } from "../types/Inputs";

interface SelectSellerProps extends AppProps {
    step: number
    contract: string
    handleChange: (event: React.ChangeEvent<FormControlElement>) => void
    updateAmount: (amount: Big) => void
}

interface SelectSellerState {
    loaded: boolean
    sellers: any[]
    pending: any[]
}

class SelectSeller extends Component<SelectSellerProps, SelectSellerState> {
    state: SelectSellerState = {
        loaded: false,
        sellers: [],
        pending: [],
    }

    async componentDidMount() {
        if (this.props.contract && this.props.contracts && this.props.storage && !this.state.loaded) {
            // load the option contract selected by the user
            let optionContract = this.props.contracts.attachOption(this.props.contract);
            // get the seller and options denoted in a amountBtc of satoshi from a single option contract
            let sellers = await optionContract.getOptionOwners();
            this.setState({
                loaded: true,
                sellers: sellers,
                pending: this.props.storage.getPendingTransactionsFor(this.props.contract),
            });
        }
    }

    renderOptions() {
        return this.state.sellers.map((seller, index) => {
            let address = seller[0].toString();
            // convert the satoshi amountBtc into a BTC amount
            let amountBtc = utils.satToBtc(utils.newBig(seller[1].toString()));
            let addressShow = address.substr(0, 10) + '...';

            if (this.state.pending.filter((value) => value.recipient === seller[0]).length > 0) return null;
            return (
                <option key={address} value={address} onClick={() => this.props.updateAmount(amountBtc)}>{amountBtc.toString()} BTC (Seller: {addressShow})</option>
            );
        })
    }

    render() {
        if (this.props.step !== 1) { // Prop: The current step
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

interface ScanBTCProps extends AppProps {
    step: number
    contract: string
    seller: string
    amountBtc: Big
    recipient: string
    option: string
    txid: string
    confirmations: number
    handleChange: (event: React.ChangeEvent<FormControlElement>) => void
    updateRecipient: (btcAddress: string) => void
    updateOption: (contract: string) => void
    updateConfirmations: (conf: number) => void
    updateStrikePrice: (strikePrice: Big) => void
    updateExpiry: (expiry: number) => void
}

interface ScanBTCState {
    loaded: boolean
    paymentUri: string
    selectionHasTxId: boolean
    recipient: string
    option: string
    expiry: number
    premium: Big
    strikePrice: Big
    amountOptions: Big
    amountDai: Big
}

class ScanBTC extends Component<ScanBTCProps, ScanBTCState> {
    state: ScanBTCState = {
        loaded: false,
        paymentUri: '',
        selectionHasTxId: false,
        recipient: '',
        option: '',
        expiry: 0,
        premium: utils.newBig(0),
        strikePrice: utils.newBig(0),
        amountOptions: utils.newBig(0),
        amountDai: utils.newBig(0),
    }

    async componentDidUpdate() {
        if (this.props.contract && this.props.contracts && this.props.seller && this.props.storage && !this.state.loaded) {
            // get all the info from the selected contract to store this into storage
            let optionContract = this.props.contracts.attachOption(this.props.contract);
            let btcAddressRaw = await optionContract.getBtcAddress(this.props.seller);
            let [expiry, premium, strikePrice] = await optionContract.getDetails();

            // strike price is denoted in weiDai per satoshi
            let amountBtcInSat = utils.btcToSat(this.props.amountBtc);
            let amountOptions = utils.newBig(amountBtcInSat || 0).mul(strikePrice);
            // exchange rate between option and dai is 1:1
            let amountDai = amountOptions;

            let btcAddress = ethers.utils.toUtf8String(ethers.utils.hexlify(btcAddressRaw));
            let paymentUri = "bitcoin:" + btcAddress + "?amount=" + this.props.amountBtc;

            // check if there is already a matching tx
            // let txid = this.props.storage.getMatchingTxId(this.props.amountBtc, btcAddress, this.props.contract);

            // if (txid) {
            //   this.setState({
            //     selectionHasTxId: true,
            //     txid: txid,
            //   })
            // }

            expiry = parseInt(expiry.toString());
            strikePrice = utils.weiDaiToBtc(utils.newBig(strikePrice.toString()));

            // set the local state
            this.setState({
                loaded: true,
                paymentUri: paymentUri,
                recipient: btcAddress,
                option: this.props.contract,
                expiry: expiry,
                premium: premium,
                strikePrice: strikePrice,
                amountOptions: amountOptions,
                amountDai: amountDai,
            });
            // set the wizard state
            this.props.updateRecipient(btcAddress);
            this.props.updateOption(this.props.contract);
            // this.props.updateTxId(txid);
            this.props.updateConfirmations(0);
            this.props.updateStrikePrice(strikePrice);
            this.props.updateExpiry(expiry);

            // store the current exercise request in storage
            // this.props.storage.setPendingOption(
            //   this.props.amountBtc,
            //   this.props.recipient,
            //   this.props.option,
            //   this.props.txid,
            //   this.props.confirmations,
            // );
        }
    }

    render() {
        if (this.props.step !== 2) {
            return null
        }
        return (
            <FormGroup>
              <h5>Payment</h5>
                  <Row className="justify-content-md-center">
                    <Col md="auto" className="text-center">
                        <p>To exercise the option, please make the following Bitcoin payment with a wallet of your choice.</p>
                        <QRCode value={this.state.paymentUri} />
                    </Col>
                </Row>
              <h5>Summary</h5>
                <FormGroup>
                    <ListGroup>
                      <ListGroupItem>Sending: <strong>{this.props.amountBtc.toString()} BTC</strong></ListGroupItem>
                      <ListGroupItem>Address: <strong>{this.state.recipient}</strong></ListGroupItem>
                      <ListGroupItem>Receiving: <strong>{utils.weiDaiToDai(this.state.amountOptions).toString()} DAI</strong></ListGroupItem>
                    </ListGroup>
                </FormGroup>
            </FormGroup>
        )
    }
}

interface SubmitProofProps {
    step: number
    handleChange: (event: React.ChangeEvent<FormControlElement>) => void,
}

class SubmitProof extends Component<SubmitProofProps> {

    render() {
        if (this.props.step !== 3) {
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

interface PayWizardProps extends AppProps {
    contract: string
    toast: any
    hide: () => void
    showPayModal: boolean
    reloadPurchased: () => void
}

interface PayWizardState {
    step: number
    seller: string
    amountOptions: number
    amountDai: number
    amountBtc: Big
    recipient: string
    option: string
    expiry: number
    premium: number
    strikePrice: Big
    txid: string
    confirmations: number
}

export default class PayWizard extends Component<PayWizardProps, PayWizardState> {
    state: PayWizardState = {
        step: 1,
        seller: "",
        amountOptions: 0,
        amountDai: 0,
        amountBtc: utils.newBig(0),
        recipient: "",
        option: "",
        expiry: 0,
        premium: 0,
        strikePrice: utils.newBig(0),
        txid: "",
        confirmations: 0,
    }

    constructor(props: PayWizardProps) {
        super(props);

        this.handleChange = this.handleChange.bind(this)
        this.updateAmount = this.updateAmount.bind(this)
        this.updateRecipient = this.updateRecipient.bind(this)
        this.updateOption = this.updateOption.bind(this)
        this.updateTxId = this.updateTxId.bind(this)
        this.updateConfirmations = this.updateConfirmations.bind(this)
        this.updateStrikePrice = this.updateStrikePrice.bind(this)
        this.updateExpiry = this.updateExpiry.bind(this)
        this.exitModal = this.exitModal.bind(this);
    }

    handleChange(event: React.ChangeEvent<FormControlElement>) {
        const { name, value } = event.target;
        this.setState(state => ({
            ...state,
            [name]: value
        }));
    }

    updateAmount(i: Big) {
        this.setState({
            amountBtc: i
        });
    }

    updateRecipient(r: string) {
      this.setState({
        recipient: r
      });
    }

    updateOption(o: string) {
      this.setState({
        option: o
      });
    }

    updateTxId(t: string) {
      this.setState({
        txid: t
      });
    }

    updateConfirmations(c: number) {
      this.setState({
        confirmations: c
      });
    }

    updateStrikePrice(s: Big) {
        this.setState({
            strikePrice: s
        });
    }

    updateExpiry(e: number) {
        this.setState({
            expiry: e
        });
    }

    isValid(step: number) {
        if (step === 0 && this.state.seller === "") {
            return false;
        }
        return true;
    }

    handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        let step = this.state.step;
        if (step <= 2) {
            if (!this.isValid(step-1)) return;
            this.setState({step: step + 1});
            return;
        }
        // store txid to local storage
        // store a mapping of the option to the txid
        const { seller, amountBtc, txid, expiry, strikePrice } = this.state;
        const optionId = utils.btcPutOptionId(expiry, strikePrice.toString());
        try {
            this.props.storage.setPendingOption(this.props.contract, txid, amountBtc.toString(), seller, optionId, 0);
            showSuccessToast(this.props.toast, 'Awaiting verification!', 3000);
            this.props.hide();
            this.forceUpdate();
            try {
                let txStatus = await this.props.btcProvider.getStatusTransaction(txid);
                this.props.storage.modifyPendingConfirmations(this.props.contract, txid, txStatus.confirmations);
            } catch(error) {}

            pollAndUpdateConfirmations(this.props.btcProvider, this.props.storage, this.props.contract, txid);
        } catch (error) {
            console.log(error);
            showFailureToast(this.props.toast, 'Failed to send transaction...', 3000);
        }
    }

    _next() {
        let step = this.state.step;
        if (!this.isValid(step-1)) return;
        // If the current step is 1 or 2, then add one on "next" button click
        step = step >= 2 ? 3 : step + 1;
        this.setState({
            step: step
        })
    }

    _prev() {
        let step = this.state.step
        // If the current step is 2 or 3, then subtract one on "previous" button click
        step = step <= 1 ? 1 : step - 1
        this.setState({
            step: step
        })
    }

    get previousButton() {
        let step = this.state.step;
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
        let step = this.state.step;
        if (step < 3) {
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
        this.props.hide();
        this.setState({step: 1});
    }

    render() {
        return (
            <Modal
                size="lg"
                aria-labelledby="contained-modal-title-vcenter"
                centered
                show={this.props.showPayModal} onHide={() => this.exitModal()}>
                <Modal.Header closeButton>
                    <Modal.Title id="contained-modal-title-vcenter">
                        Submit Payment
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form onSubmit={this.handleSubmit}>
                        <SelectSeller
                            step={this.state.step}
                            handleChange={this.handleChange}
                            // seller={this.state.seller}
                            // amountBtc={this.state.amountBtc}
                            updateAmount={this.updateAmount}
                            {...this.props}
                        />
                        <ScanBTC
                            step={this.state.step}
                            handleChange={this.handleChange}
                            updateRecipient = {this.updateRecipient}
                            updateOption = {this.updateOption}
                            updateConfirmations = {this.updateConfirmations}
                            updateStrikePrice = {this.updateStrikePrice}
                            updateExpiry = {this.updateExpiry}
                            seller={this.state.seller}
                            amountBtc={this.state.amountBtc}
                            recipient = {this.state.recipient}
                            option = { this.state.option }
                            txid = { this.state.txid }
                            confirmations = { this.state.confirmations }
                            {...this.props}
                        />
                        <SubmitProof
                            step={this.state.step}
                            handleChange={this.handleChange}
                            {...this.props}
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