import React, { Component } from "react";
import { Col, Badge, Row, Table, Button, Card, Spinner, Modal, Toast } from "react-bootstrap";
import { Redirect } from "react-router-dom";
import { ethers } from 'ethers';
import { ToastContainer, toast } from 'react-toastify';
import optionSellableArtifact from "../artifacts/IERC20Sellable.json"
import optionBuyableArtifact from "../artifacts/IERC20Buyable.json"
import * as utils from '../utils/utils.js';
import { ButtonTool } from "./ButtonTool";

export default class UserSoldOptions extends Component {
    constructor(props) {
        super(props);
        this.state = {
            soldLoaded: false,
            soldOptions: [],
            totalInsured: 0,
            totalBtcInsured: 0,
            percentSold: 0,
            insuredBTC: 0,
            insuranceAvailable: 0,
            totalPremium: 0,
            totalIncome : 0,
            showRefund: false,
            refundOption: {}
        };
    }

    componentDidUpdate() {
        if (this.props.contracts && this.props.address) {
            if (!this.state.soldLoaded) {
                this.getCurrentOptions();
            }
        }
    }

    async getCurrentOptions() {
        if (this.props.contracts && this.props.address) {
            let optionContracts = await this.props.contracts.getUserSoldOptions(this.props.address);
            let soldOptions = await this.getOptions(optionContracts)
            this.setState({
                soldOptions: soldOptions,
                soldLoaded: true
            });
        }
    }

    async getOptions(optionContracts) {
        console.log(optionContracts);
        // Remove 0-value contracts
        for (var i = optionContracts[1].length - 1; i >= 0; i--) {
            if (parseInt(optionContracts[1][i]._hex) == 0) {
                optionContracts[0].splice(i, 1);
                optionContracts[1].splice(i, 1);
                optionContracts[2].splice(i, 1);
            }
        }

        let options = [];
        let totalLocked = 0;
        let totalInsured = 0;
        let totalPremium = 0;
        let totalBtcInsured = 0;
        let totalIncome = 0;
        for (var i = 0; i < optionContracts[0].length; i++) {
            let addr = optionContracts[0][i];
            let optionContract = this.props.contracts.attachOption(addr);

            console.log("!!!!!", (await optionContract.getDetails())[3].toString())

            let optionRes = await optionContract.getDetails();
            let option = {
                expiry: parseInt(optionRes[0].toString()),
                premium: utils.weiDaiToBtc(optionRes[1]),
                strikePrice: utils.weiDaiToBtc(optionRes[2]),
                totalSupply: optionRes[3].toString(),

                // User's unsold options & total locked DAI
                unsoldOptions: utils.weiDaiToDai(optionContracts[1][i].toString()),
                totalSupplyLocked: utils.weiDaiToDai(optionContracts[2][i].toString())
            }
            option.unsoldOptions = (await optionContract.unsoldOptionsForSigner()).toString();
            option.totalOptions = (await optionContract.totalOptionsForSigner()).toString();
            option.soldOptions = utils.sub(option.totalOptions, option.unsoldOptions);
            option.spotPrice = this.props.btcPrices.dai;
            option.contract = optionContracts[0][i];
            option.percentSold = ((option.totalSupplyLocked <= 0) ? 0 : Math.round(10000*option.soldOptions / option.totalSupplyLocked) / 100)
            option.btcInsured = utils.div(option.soldOptions, option.strikePrice);
            option.premiumEarned = utils.mul(option.premium, option.btcInsured);
            option.income = option.btcInsured * (option.premium + option.strikePrice - option.spotPrice);

            totalPremium = utils.add(totalPremium, option.premium);
            totalInsured = utils.add(totalInsured, option.totalSupplyLocked);            
            options.push(option);

            totalLocked = utils.add(totalLocked, option.totalSupplyLocked);
            totalInsured = utils.add(totalInsured, option.soldOptions);
            totalBtcInsured = utils.add(totalBtcInsured, option.btcInsured);
            totalPremium = utils.add(totalPremium, utils.mul(option.premium, option.btcInsured));
            totalIncome = utils.add(totalIncome, option.income);

        }

        let percentSold = ((totalLocked <= 0) ? 0 : Math.round(10000*totalInsured / totalLocked) / 100)
        this.setState({
            totalLocked: totalLocked,
            totalPremium: totalPremium,
            totalInsured: totalInsured,
            totalBtcInsured: totalBtcInsured,
            percentSold: percentSold,
            totalIncome: totalIncome,
        });
        return options;
    }


    handleRefund(index) {
        this.setState({
            refundOption: this.state.soldOptions[index],
            showRefund: true
        });
    }

    async doRefund() {
        try {
            await this.props.contracts.refundOption(this.state.refundOption.contract);
            toast.success('Refund successful!', {
                position: "top-center",
                autoClose: 3000,
                hideProgressBar: false,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
                progress: undefined,
            });
            this.forceUpdate()
        } catch (error) {
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
            refundOption: {},
            showRefund: false,
        });

    }

    cancelRefund() {
        this.setState({
            refundOption: {},
            showRefund: false
        });
    }


    renderTableData() {
        if (this.state.soldLoaded) {
            if (this.state.soldOptions.length > 0) {
                return this.state.soldOptions.map((option, index) => {
                    const { expiry, premium, strikePrice, spotPrice, totalSupply, totalSupplyLocked, totalOptions, soldOptions, percentSold, income, btcInsured, premiumEarned, contract } = option;

                    let percentInsured = 0;
                    if (totalSupply > 0) {
                        percentInsured = utils.calculatePercentage(totalSupplyLocked, totalSupply);
                    }
                    let currentDate = Math.floor(Date.now() / 1000);
                    let priceDiff = strikePrice-spotPrice;
                    return (
                        <tr key={expiry}>
                            <td>{new Date(expiry * 1000).toLocaleString()}</td>
                            <td>{strikePrice} DAI</td>
                            <td><span  className={(income >= 0 ? "text-success": "text-danger")}>{spotPrice}</span> DAI</td>
                            <td><strong>{soldOptions}</strong> / {totalOptions} DAI <br/>({percentSold}%) </td>
                            <td>{totalSupplyLocked} / {totalSupply} DAI <br/> ({percentInsured}%)</td>
                            <td><strong className={"text-success"}>{premiumEarned}</strong> DAI <br/> ({premium} DAI/BTC)</td>
                            <td><strong className={(income >= 0 ? "text-success": "text-danger")}>{income}</strong> DAI </td>

                            <td>
                                <ButtonTool
                                    disable={(expiry >= currentDate)}
                                    reason={(expiry >= currentDate) ? "Not Expired" : null}
                                    placement={"right"}
                                    text={"Refund"}
                                    variant={"outline-danger"}
                                    show={this.handleRefund}
                                    showValue={index}
                                />
                            </td>
                        </tr>
                    )
                })
            } else {
                return <tr><td colSpan="7">No options sold yet</td></tr>
            }
        } else {
            return <tr><td colSpan="7" className="text-center"><Spinner animation="border" /></td></tr>
        }
    }

    // Earning details: <br/> (<strong className={"text-success"}>{premiumEarned}</strong> {(priceDiff > 0) && '+'} <strong className={(this.income >= 0 ? "text-success": "text-danger")}>{priceDiff} price delta)</strong>

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
                        <Card.Title><h2>Sold BTC/DAI Put Option Contracts</h2>
                            {!this.state.soldLoaded &&
                                <Row>
                                    <Col className="text-center">
                                        <Spinner animation="border" />
                                    </Col>
                                </Row>
                            }
                            {this.state.soldLoaded &&
                                <Row className="text-center">
                                    <Badge>
                                        <Col md={4}>
                                            <h3>{this.state.totalInsured} DAI  ({this.state.percentSold}%)</h3>
                                            <h6>DAI Insurance Sold</h6>
                                            <h6>({this.state.totalBtcInsured} BTC)</h6>
                                        </Col>
                                    </Badge>
                                    <Badge>
                                        <Col md={4}>
                                            <h3>{this.state.totalLocked}</h3>
                                            <h6>DAI Locked</h6>
                                        </Col>
                                    </Badge>
                                    <Badge>
                                        <Col md={4}>
                                            <h3 className={(this.state.totalPremium > 0 ? "text-success": (this.state.totalPremium < 0 ? "text-danger" : ""))}>{this.state.totalPremium}</h3>
                                            <h6>DAI Premium Earned</h6>
                                        </Col>
                                    </Badge>
                                    <Badge>
                                        <Col md={4}>
                                            <h3 className={(this.state.totalIncome > 0 ? "text-success": (this.state.totalIncome < 0 ? "text-danger" : ""))}>{this.state.totalIncome}</h3>
                                            <h6>DAI Income</h6>
                                        </Col>
                                    </Badge>
                                </Row>
                            }
                        </Card.Title>
                    </Card.Header>
                    {this.state.soldLoaded &&
                        <Card.Body>
                            <Row>
                                <Table hover responsive>
                                    <thead>
                                        <tr>
                                            <th>Expiry</th>
                                            <th>Strike Price</th>
                                            <th>Current Price</th>
                                            <th>Your Sold</th>
                                            <th>Total Sold</th>
                                            <th>Premium Earned</th>
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
                    show={this.state.showRefund} onHide={() => this.setState({ showRefund: false })}>
                    <Modal.Header closeButton>
                        <Modal.Title id="contained-modal-title-vcenter">
                            Refund {this.state.refundOption.totalSupplyLocked} DAI From Option Contract?
                        </Modal.Title>
                    </Modal.Header>
                    <Modal.Body>
                        <p>
                            Are you sure you want to refund this option contract, worth <strong>{this.state.refundOption.totalSupplyLocked} DAI</strong> to <strong>{this.props.address}</strong>?
                        </p>
                    </Modal.Body>
                    <Modal.Footer>
                        <Button onClick={() => this.doRefund()}>Refund</Button>
                        <Button variant="danger" onClick={() => this.cancelRefund()}>Cancel</Button>
                    </Modal.Footer>
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