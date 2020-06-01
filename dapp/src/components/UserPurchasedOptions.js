import React, { Component } from "react";
import { Col, Badge, Row, Table, Form, Button, Card, Spinner, Modal, ListGroup, ListGroupItem, FormGroup, FormControl, ProgressBar } from "react-bootstrap";
import { ToastContainer, toast } from 'react-toastify';
import * as utils from '../utils/utils.js';
import ExerciseWizard from './WizardExercise';

export default class UserPurchasedOptions extends Component {

    constructor(props) {
        super(props);
        this.state = {
            purchasedLoaded: false,
            purchasedOptions: [],
            totalInsured: utils.newBig(0),
            insuranceAvailable: utils.newBig(0),
            paidPremium: utils.newBig(0),
            totalIncome: utils.newBig(0),
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

        this.hideExerciseModel = this.hideExerciseModel.bind(this)
    }

    componentDidUpdate() {
        if (this.props.contracts && this.props.address) {
            if (!this.state.purchasedLoaded) {
                this.getAvailableOptions();
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

    async getOptions(optionContracts) {
        // Remove 0-value contracts
        for (var i = optionContracts[1].length - 1; i >= 0; i--) {
            if (parseInt(optionContracts[1][i]._hex) == 0) {
                optionContracts[0].splice(i, 1);
                optionContracts[1].splice(i, 1);
            }
        }

        let options = [];
        let totalBtcInsured = utils.newBig(0);
        let paidPremium = utils.newBig(0);
        let totalIncome = utils.newBig(0);
        try {
            for (var i = 0; i < optionContracts[0].length; i++) {
                let addr = optionContracts[0][i];
                let optionContract = this.props.contracts.attachOption(addr);
                let optionRes = await optionContract.getDetails();
                let option = {
                    expiry: parseInt(optionRes[0].toString()),
                    premium: utils.weiDaiToBtc(utils.newBig(optionRes[1].toString())),
                    strikePrice: utils.weiDaiToBtc(utils.newBig(optionRes[2].toString())),
                    totalSupply: utils.weiDaiToDai(utils.newBig(optionRes[3].toString())),
                    // User's purchased options
                    totalSupplyLocked: utils.weiDaiToDai(utils.newBig(optionContracts[1][i].toString())),
                }
                option.spotPrice = utils.newBig(this.props.btcPrices.dai);
                option.contract = optionContracts[0][i];
                option.btcInsured = option.totalSupplyLocked.div(option.strikePrice);
                option.premiumPaid = option.premium.mul(option.btcInsured);

                let income = option.btcInsured.mul(option.spotPrice.sub(option.strikePrice).sub(option.premium));
                option.income = income;
                options.push(option);

                paidPremium = paidPremium.add(option.premiumPaid);
                totalBtcInsured = totalBtcInsured.add(option.btcInsured);
                totalIncome = totalIncome.add(option.income);
            }
            this.setState({
                paidPremium: paidPremium,
                totalInsured: totalBtcInsured,
                totalIncome: totalIncome,
                totalBtcInsured: totalBtcInsured
            });
        } catch (error) {
            console.log(error);
        }
        return options;
    }

    renderTableData() {
        if (this.state.purchasedOptions.length > 0) {
            return this.state.purchasedOptions.map((option, index) => {
                const { expiry, premium, strikePrice, spotPrice, totalSupply, totalSupplyLocked, income, btcInsured, premiumPaid, totalSupplyUnlocked, contract } = option;

                let percentInsured = ((totalSupply.lte(0)) ? utils.newBig(0) : (totalSupplyLocked.div(totalSupply)).mul(100));
                return (
                    <tr key={strikePrice.toString()}>
                        <td>{new Date(expiry * 1000).toLocaleString()}</td>
                        <td>{strikePrice.toString()} DAI</td>
                        <td><span className={(income >= 0.0 ? "text-success" : "text-danger")}>{spotPrice.toString()}</span> DAI</td>
                        <td>{totalSupplyLocked.round(2, 0).toString()} / {totalSupply.round(2, 0).toString()} DAI ({percentInsured.toFixed(0)} %)</td>
                        <td>{premiumPaid.round(2, 0).toString()} DAI <br /> ({premium.round(2, 0).toString()} DAI/BTC)</td>
                        <td><strong className={(income.gte(0) ? "text-success" : "text-danger")}>{income.round(2, 0).toString()}</strong> DAI </td>

                        <td>
                            <Button variant="outline-success" onClick={() => { this.showExerciseModel(option.contract) }}>
                                Exercise
                            </Button>
                        </td>
                    </tr>
                )
            })
        } else {
            return <tr><td colSpan="7">No options purchased yet</td></tr>
        }
    }

    handleChange(event) {
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

    showExerciseModel(contract) {
        this.setState({
            contractAddress: contract,
            showExerciseModal: true,
        });
    }

    hideExerciseModel() {
        this.setState({
            currentStep: 1,
            showExerciseModal: false,
        })
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
                        <Card.Title><h2 className="text-center">Purchased BTC/DAI Put Option Contracts</h2>
                            {!this.state.purchasedLoaded &&
                                <Row>
                                    <Col className="text-center">
                                        <Spinner animation="border" />
                                    </Col>
                                </Row>
                            }
                            {this.state.purchasedLoaded &&
                                <Row className="text-left">
                                    <Col>
                                        <h3>{this.state.totalInsured.round(2, 0).toString()} BTC</h3>
                                        <h6>Insured</h6>
                                    </Col>
                                    <Col>
                                        <h3>{this.state.paidPremium.round(2, 0).toString()} DAI</h3>
                                        <h6>Premium Paid</h6>
                                    </Col>
                                    <Col>
                                        <h3 className={(this.state.totalIncome.gt(0) ? "text-success" : (this.state.totalIncome.toLocaleString(0) ? "text-danger" : ""))}>{this.state.totalIncome.round(2, 0).toString()} DAI</h3>
                                        <h6>(Potential) Income</h6>
                                    </Col>
                                </Row>
                            }
                        </Card.Title>
                    </Card.Header>
                    {this.state.purchasedLoaded &&
                        <Card.Body>
                            <Row>
                                <Table hover responsive>
                                    <thead>
                                        <tr>
                                            <th>Expiry</th>
                                            <th>Strike Price</th>
                                            <th>Current Price</th>
                                            <th>Insurance Issued</th>
                                            <th>Premium Paid</th>
                                            <th>Earnings</th>
                                            <th>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {this.renderTableData()}
                                    </tbody>
                                </Table>
                            </Row>
                        </Card.Body>
                    }
                </Card>

                <Modal
                    size="lg"
                    aria-labelledby="contained-modal-title-vcenter"
                    centered
                    show={this.state.showExerciseModal} onHide={() => this.setState({ showExerciseModal: false })}>
                    <ExerciseWizard contract={this.state.contractAddress} hide={this.hideExerciseModel} toast={toast} {...this.props}></ExerciseWizard>
                </Modal>
            </Col>
        </div>;
    }
}