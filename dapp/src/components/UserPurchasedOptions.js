import React, { Component } from "react";
import { Col, Badge, Row, Table, Form, Button, Card, Spinner, Modal, ListGroup, ListGroupItem, FormGroup, FormControl, ProgressBar } from "react-bootstrap";
import { ethers } from 'ethers';
import { ToastContainer, toast } from 'react-toastify';
import QRCode from "react-qr-code";
import * as utils from '../utils/utils.js';

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
            let optionContract = this.props.contracts.attachOption(this.props.contract);
            let [sellers, options] = await optionContract.getOptionOwnersFor(this.props.address);
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
            let amount = utils.weiDaiToBtc(this.state.options[index].toNumber());
            return (
                <option key={address} value={address} onClick={() => this.props.updateAmount(amount)}>{address} - {amount} BTC</option>
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
            paymentUri: null
        };
    }

    async componentDidUpdate() {
        if (this.props.contract && this.props.contracts && !this.state.loaded) {
            let optionContract = this.props.contracts.attachOption(this.props.contract);
            let btcAddressRaw = await optionContract.getBtcAddress(this.props.seller);
            let btcAddress = ethers.utils.hexlify(btcAddressRaw).toString();
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
            progress : 0
        }
    }

    componentDidMount() {
        let proofCountdown = setInterval(() => {
            this.setState({
                progress: this.state.progress + 10
            })
            if ( this.state.progress >= 100) clearInterval(proofCountdown);
        }, 1000);
    }

    componentDidUpdate(){
        if(this.state.progress >= 100){

        }
    }
    render() {
        if (this.props.currentStep !== 3) {
            return null
        }
        return (
            <div>
                <h4>Watching for Bitcoin payment...</h4>
                <ProgressBar striped variant="success" now={this.state.progress} />
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
            </div>
        )
    }
}

export default class UserPurchasedOptions extends Component {

    constructor(props) {
        super(props);
        this.state = {
            purchasedLoaded: false,
            purchasedOptions: [],
            totalInsured: 0,
            insuranceAvailable: 0,
            totalPremium: 0,
            showExercise: false,
            exerciseOption: {},
            currentStep: 1,
            amount: 0,
            height: 0,
            index: 0,
            txid: null,
            proof: null,
            rawtx: null,
        };

        this.handleChange = this.handleChange.bind(this)
        this.updateAmount = this.updateAmount.bind(this)
    }

    componentDidUpdate() {
        if (this.props.contracts && this.props.address) {
            if (!this.state.purchasedLoaded) {
                this.getAvailableOptions();
            }
            if (!this.state.soldLoaded) {
                this.getCurrentOptions();
            }
        }
    }

    async getAvailableOptions() {
        if (this.props.contracts && this.props.address) {
            let optionContracts = await this.props.contracts.getUserPurchasedOptions(this.props.address);
            let purchasedOptions = await this.getOptions(optionContracts)
            this.setState({
                purchasedOptions: purchasedOptions,
                purchasedLoaded: true
            });
        }
    }

    async getCurrentOptions() {
        if (this.props.contracts && this.props.address) {
            let optionContracts = await this.props.contracts.getUserPurchasedOptions(this.props.address);
            let purchasedOptions = await this.getOptions(optionContracts)
            this.setState({
                purchasedOptions: purchasedOptions,
                soldLoaded: true
            });
        }
    }

    async getOptions(optionContracts) {
        // Remove 0-value contracts
        for (var i = optionContracts[1].length - 1; i >= 0; i--) {
            if (parseInt(optionContracts[1][i]._hex) == 0) {
                optionContracts[0].splice(i, 1);
                optionContracts[1].splice(i, 1);
            }
        }

        let options = [];
        let insuredBTC = 0;
        let paidPremium = 0;
        try {
            for (var i = 0; i < optionContracts[0].length; i++) {
                let addr = optionContracts[0][i];
                let optionContract = this.props.contracts.attachOption(addr);
                let optionRes = await optionContract.getDetails();
                let option = {
                    expiry: parseInt(optionRes[0]._hex),
                    premium: utils.weiDaiToBtc(parseInt(optionRes[1]._hex)),
                    strikePrice: utils.weiDaiToBtc(parseInt(optionRes[2]._hex)),
                    totalSupply: utils.weiDaiToDai(parseInt(optionRes[3]._hex)),
                    totalSupplyLocked: utils.weiDaiToDai(parseInt(optionContracts[1][i]._hex)),
                }
                option.spotPrice = this.props.btcPrices.dai;
                option.contract = optionContracts[0][i];

                insuredBTC += option.totalSupplyLocked / option.strikePrice;
                paidPremium += option.premium;
                options.push(option);
            }

            this.setState({
                totalPremium: 100,
                totalInsured: insuredBTC
            });
        } catch (error) {
            console.log(error);
        }
        return options;
    }

    renderTableData() {
        if (this.state.purchasedLoaded) {
            if (this.state.purchasedOptions.length > 0) {
                return this.state.purchasedOptions.map((option, index) => {
                    const { expiry, premium, strikePrice, spotPrice, totalSupply, totalSupplyLocked, totalSupplyUnlocked, contract } = option;

                    let percentInsured = 0;
                    if (totalSupply > 0) {
                        percentInsured = Math.round(10000 * totalSupplyLocked / totalSupply) / 100;
                    }
                    return (
                        <tr key={strikePrice}>
                            <td>{new Date(expiry * 1000).toLocaleString()}</td>
                            <td>{strikePrice} DAI</td>
                            <td>{spotPrice} DAI</td>
                            <td>{totalSupplyLocked} / {totalSupply} DAI ({percentInsured} %)</td>
                            <td>{premium} DAI/BTC</td>

                            <td>
                                <Button variant="outline-success" onClick={() => { this.handleExercise(index) }}>
                                    Exercise
                                </Button>
                            </td>
                        </tr>
                    )
                })
            } else {
                return <tr><td colSpan="7">No options purchased yet</td></tr>
            }
        } else {
            return <tr><td colSpan="7" className="text-center"><Spinner animation="border" /></td></tr>
        }
    }

    handleExercise(index) {
        this.setState({
            exerciseOption: this.state.purchasedOptions[index],
            showExercise: true
        });
    }

    handleChange(event) {
        console.log(event.target);
        const { name, value } = event.target;
        this.setState({
            [name]: value
        });
    }

    updateAmount(i) {
        this.setState({
            amount: i
        });
    }

    handleSubmit = async (event) => {
        event.preventDefault();
        const { seller, height, index, txid, proof, rawtx, exerciseOption } = this.state;

        try {
            // This is mocked. BTC-Relay connection works, but querying proof in backend is still WIP.
            await this.props.contracts.exerciseOption(exerciseOption.contract, seller, 1000, 1, "0xe91669bf43109bbd3ed730d8a5ebdc691b5d7482d2cf034c7a0db12023db8e5f", "0x00", "0x00");
            toast.success('Exercise successful!', {
                position: "top-center",
                autoClose: 3000,
                hideProgressBar: false,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
                progress: undefined,
            });
            this.forceUpdate();
        } catch (error) {
            console.log(error);
            toast.error('Oops.. Something went wrong!', {
                position: "top-center",
                autoClose: 3000,
                hideProgressBar: false,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
                progress: undefined,
            });
        }
        this.setState({
            exerciseOption: {},
            showExercise: false,
        });

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
        // If the current step is not 1, then render the "previous" button
        if (currentStep !== 1) {
            return (
                <button
                    className="btn btn-secondary float-left"
                    type="button" onClick={() => this._prev()}>
                    Previous
                </button>
            )
        }
        // ...else return nothing
        return null;
    }

    get nextButton() {
        let currentStep = this.state.currentStep;
        // If the current step is not 3, then render the "next" button
        if (currentStep < 3) {
            return (
                <button
                    className="btn btn-primary float-right"
                    type="button" onClick={() => this._next()}>
                    Next
                </button>
            )
        }
        // ...else render nothing
        return null;
    }


    render() {
        return <div>
            <ToastContainer
                position="top-center"
                autoClose={5000}
                hideProgressBar={false}
                newestOnTop={false}
                closeOnClick
                rtl={false}
                pauseOnFocusLoss
                draggable
                pauseOnHover
            />
            <Col xl={{ span: 8, offset: 2 }}>
                <Card border="dark">
                    <Card.Header>
                        <Card.Title><h2>Purchased BTC/DAI Put Option Contracts</h2>
                            <Row className="text-center">
                                <Badge>
                                    <Col md={4}>
                                        <h3>{this.state.totalInsured}</h3>
                                        <h6>BTC</h6>
                                    </Col>
                                </Badge>
                                <Badge>
                                    <Col md={4}>
                                        <h3>{this.state.totalPremium}</h3>
                                        <h6>DAI Premium Paid</h6>
                                    </Col>
                                </Badge>
                            </Row>
                        </Card.Title>
                    </Card.Header>
                    <Card.Body>
                        <Row>
                            <Table hover responsive>
                                <thead>
                                    <tr>
                                        <th>Expiry</th>
                                        <th>Strike Price</th>
                                        <th>Current Price</th>
                                        <th>Insurance Issued</th>
                                        <th>Premium</th>
                                        <th>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {this.renderTableData()}
                                </tbody>
                            </Table>
                        </Row>

                    </Card.Body>
                </Card>

                <Modal
                    size="lg"
                    aria-labelledby="contained-modal-title-vcenter"
                    centered
                    show={this.state.showExercise} onHide={() => this.setState({ showExercise: false })}>
                    <Modal.Header closeButton>
                        <Modal.Title id="contained-modal-title-vcenter">
                            Exercise Option
                </Modal.Title>
                    </Modal.Header>

                    <Form onSubmit={this.handleSubmit}>
                        <Modal.Body>
                            <SelectSeller
                                currentStep={this.state.currentStep}
                                handleChange={this.handleChange}
                                seller={this.state.seller}
                                amount={this.state.amount}
                                updateAmount={this.updateAmount}
                                contract={this.state.exerciseOption.contract}
                                contracts={this.props.contracts}
                                signer={this.props.signer}
                                address={this.props.address}
                            />
                            <ScanBTC
                                currentStep={this.state.currentStep}
                                handleChange={this.handleChange}
                                updateAmount={this.updateAmount}
                                seller={this.state.seller}
                                contract={this.state.exerciseOption.contract}
                                contracts={this.props.contracts}
                                signer={this.props.signer}
                                amount={this.state.amount}
                            />
                            <SubmitProof
                                currentStep={this.state.currentStep}
                                handleChange={this.handleChange}
                                seller={this.state.seller}
                            />

                        </Modal.Body>
                        <Modal.Footer>
                            {this.previousButton}
                            {this.nextButton}
                            <Button variant="danger" onClick={() => this.cancelExercise()}>Cancel</Button>
                        </Modal.Footer>
                    </Form>

                </Modal>
            </Col>
        </div>;
    }

    /*
    getDummyOptions() {
        return [
            {
                expiry: 1591012800,
                premium: 10,
                strikePrice: 9250,
                totalSupplyLocked: 450,
                totalSupply: 5000,
                premium: 100,

            },
            {
                expiry: 1590795000,
                premium: 15,
                strikePrice: 9000,
                totalSupplyLocked: 4532,
                premium: 150,
                totalSupply: 7850
            },
            {
                expiry: 1590148800,
                premium: 5,
                strikePrice: 10000,
                totalSupplyLocked: 120,
                premium: 500,
                totalSupply: 540
            },
            {
                expiry: 1590018300,
                premium: 11,
                strikePrice: 8909,
                totalSupplyLocked: 6543,
                premium: 7700,
                totalSupply: 9700
            }
        ]
    }
    */

}