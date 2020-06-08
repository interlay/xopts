import React, { Component } from "react";
import { Col, Row, Table, Button, Card, Spinner, Modal } from "react-bootstrap";
import { ToastContainer, toast } from 'react-toastify';
import * as utils from '../utils/utils.js';
import { ButtonTool } from "./ButtonTool";

export default class UserSoldOptions extends Component {
    constructor(props) {
        super(props);
        this.state = {
            soldLoaded: false,
            soldOptions: [],
            totalInsured: utils.newBig(0),
            totalBtcInsured: utils.newBig(0),
            percentSold: utils.newBig(0),
            insuranceAvailable: utils.newBig(0),
            totalPremium: utils.newBig(0),
            totalIncome : utils.newBig(0),
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
        // Remove 0-value contracts
        for (let i = optionContracts[1].length - 1; i >= 0; i--) {
            if (parseInt(optionContracts[1][i]._hex) === 0) {
                optionContracts[0].splice(i, 1);
                optionContracts[1].splice(i, 1);
                optionContracts[2].splice(i, 1);
            }
        }

        let options = [];
        let totalLocked = utils.newBig(0);
        let totalInsured = utils.newBig(0);
        let totalPremium = utils.newBig(0);
        let totalBtcInsured = utils.newBig(0);
        let totalIncome = utils.newBig(0);
        for (let i = 0; i < optionContracts[0].length; i++) {
            let addr = optionContracts[0][i];
            let optionContract = this.props.contracts.attachOption(addr);
            let optionRes = await optionContract.getDetails();
            let option = {
                expiry: parseInt(optionRes[0].toString()),
                premium: utils.weiDaiToBtc(utils.newBig(optionRes[1].toString())),
                strikePrice: utils.weiDaiToBtc(utils.newBig(optionRes[2].toString())),
                totalSupply: utils.weiDaiToDai(utils.newBig(optionRes[3].toString())),

                // User's unsold options & total locked DAI
                unsoldOptions: utils.weiDaiToDai(utils.newBig(optionContracts[1][i].toString())),
                totalSupplyLocked: utils.weiDaiToDai(utils.newBig(optionContracts[2][i].toString()))
            }
            option.soldOptions = option.totalSupplyLocked.sub(option.unsoldOptions);
            option.spotPrice = this.props.btcPrices.dai;
            option.contract = optionContracts[0][i];
            option.percentSold = ((option.totalSupplyLocked.lte(0)) ? 0 : (option.soldOptions.div(option.totalSupplyLocked)).mul(100));
            option.btcInsured = option.soldOptions.div(option.strikePrice);
            option.premiumEarned = option.premium.mul(option.btcInsured);
            option.income = option.btcInsured.mul((option.premium.add(option.strikePrice)).sub(option.spotPrice));

            options.push(option);

            totalLocked = totalLocked.add(option.totalSupplyLocked);
            totalInsured = totalInsured.add(option.soldOptions);
            totalBtcInsured = totalBtcInsured.add(option.btcInsured);
            totalPremium = totalPremium.add(option.premium.mul(option.btcInsured));
            totalIncome = totalIncome.add(option.income);
        }

        let percentSold = ((totalLocked.lte(0)) ? utils.newBig(0) : (totalInsured.div(totalLocked)).mul(100));
        this.setState({
            totalLocked: totalLocked,
            totalPremium: totalPremium,
            totalInsured: totalInsured,
            totalBtcInsured: totalBtcInsured,
            percentSold: percentSold,
            totalIncome: totalIncome
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
                    const { expiry, premium, strikePrice, spotPrice, totalSupply, totalSupplyLocked, soldOptions, percentSold, income, premiumEarned, contract } = option;
                    const id = utils.btcPutOptionId(expiry, strikePrice.toString());
                    let percentInsured = ((totalSupply.lte(0)) ? 0 : (totalSupplyLocked.div(totalSupply)).mul(100));
                    let currentDate = Math.floor(Date.now() / 1000);
                    return (
                        <tr key={contract}>
                            <td>{id}</td>
                            <td>{new Date(expiry * 1000).toLocaleString()}</td>
                            <td>{strikePrice.toString()} DAI</td>
                            <td><span  className={(income.gte(0) ? "text-success": "text-danger")}>{spotPrice}</span> DAI</td>
                            <td><strong>{soldOptions.round(2, 0).toString()}</strong> / {totalSupplyLocked.round(2, 0).toString()} DAI <br/>({percentSold.toFixed(0)}%) </td>
                            <td>{totalSupplyLocked.round(2, 0).toString()} / {totalSupply.round(2, 0).toString()} DAI <br/> ({percentInsured.toFixed(0)}%)</td>
                            <td><strong className={"text-success"}>{premiumEarned.round(2, 0).toString()}</strong> DAI <br/> ({premium.round(2, 0).toString()} DAI/BTC)</td>
                            <td><strong className={(income.gte(0) ? "text-success": "text-danger")}>{income.round(2, 0).toString()}</strong> DAI </td>

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
                return <tr><td className="text-center" colSpan="9">No Options</td></tr>
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
                        <Card.Title>
                            <h2 className="text-center">Sold BTC/DAI Put Option Contracts</h2>
                            {!this.state.soldLoaded &&
                                <Row>
                                    <Col className="text-center">
                                        <Spinner animation="border" />
                                    </Col>
                                </Row>
                            }
                            {this.state.soldLoaded &&
                                <Row className="text-center">
                                    <Col>
                                        <h3>{this.state.totalInsured.round(2, 0).toString()} DAI ({this.state.percentSold.round(2, 0).toString()}%)</h3>
                                        <h6>Insurance Sold</h6>
                                        <h6>({this.state.totalBtcInsured.round(2, 0).toString()} BTC)</h6>
                                    </Col>
                                    <Col>
                                        <h3>{this.state.totalLocked.round(2, 0).toString()} DAI</h3>
                                        <h6>Locked</h6>
                                    </Col>
                                    <Col>
                                        <h3 className={(this.state.totalPremium.gt(0) ? "text-success": (this.state.totalPremium.lt(0) ? "text-danger" : ""))}>{this.state.totalPremium.toString()} DAI</h3>
                                        <h6>Premium Earned</h6>
                                    </Col>
                                    <Col>
                                        <h3 className={(this.state.totalIncome.gt(0) ? "text-success": (this.state.totalIncome.lt(0) ? "text-danger" : ""))}>{this.state.totalIncome.toString()} DAI</h3>
                                        <h6>Income</h6>
                                    </Col>
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
                                            <th>ID</th>
                                            <th>Expiry</th>
                                            <th>Strike Price</th>
                                            <th>Current Price</th>
                                            <th>Your Sold</th>
                                            <th>Total Sold</th>
                                            <th>Premium Earned</th>
                                            <th>Potential Earnings</th>
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
}