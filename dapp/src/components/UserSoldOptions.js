import React, { Component } from "react";
import { Col, Badge, Row, Table, Button, Card, Spinner, Modal, Toast } from "react-bootstrap";
import { Redirect } from "react-router-dom";
import { ethers } from 'ethers';
import { ToastContainer, toast } from 'react-toastify';
import optionSellableArtifact from "../artifacts/IERC20Sellable.json"
import optionBuyableArtifact from "../artifacts/IERC20Buyable.json"
import * as utils from '../utils/utils.js'; 

export default class UserSoldOptions extends Component {
    constructor(props) {
        super(props);
        this.state = {
            soldLoaded: false,
            soldOptions: [],
            totalInsured: 0,
            btcInsured: 0,
            insuranceAvailable: 0,
            totalPremium: 0,
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
        for (var i = optionContracts[1].length - 1; i >= 0; i--) {
            if (parseInt(optionContracts[1][i]._hex) == 0) {
                optionContracts[0].splice(i, 1);
                optionContracts[1].splice(i, 1);
            }
        }

        let options = [];
        let totalInsured = 0;
        let totalPremium =  0;
        let btcInsured = 0;
        for (var i = 0; i < optionContracts[0].length; i++) {
            let addr = optionContracts[0][i];
            let optionContract = this.props.contracts.attachOption(addr);
            let optionRes = await optionContract.getDetails(); 
            let option = {
                expiry: parseInt(optionRes[0]._hex),
                premium: utils.weiDaiToBtc(parseInt(optionRes[1]._hex)),
                strikePrice: utils.weiDaiToBtc(parseInt(optionRes[2]._hex)),
                totalSupply: utils.weiDaiToDai(parseInt(optionRes[3]._hex)),
                // get total supply locked by this user
                totalSupplyLocked: utils.weiDaiToDai(parseInt(optionRes[4]._hex)),

                //totalSupplyLocked: utils.weiDaiToDai(parseInt(optionContracts[1][i]._hex)),
            }
            option.spotPrice = this.props.btcPrices.dai;
            option.contract = optionContracts[0][i];
            console.log(option);

            totalPremium += option.premium;
            totalInsured += option.totalSupplyLocked;
            btcInsured += option.totalSupplyLocked / option.strikePrice;
            options.push(option);
        }

        this.setState({
            totalPremium: totalPremium,
            totalInsured: totalInsured,
            btcInsured: btcInsured
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
                    const { expiry, premium, strikePrice, spotPrice, totalSupply, totalSupplyLocked, totalSupplyUnlocked, contract } = option;

                    let percentInsured = 0;
                    if (totalSupply > 0) {
                        percentInsured = Math.round(10000 * totalSupplyLocked / totalSupply) / 100;
                    }
                    let currentDate = Math.floor(Date.now() / 1000);
                    return (
                        <tr key={expiry}>
                            <td>{new Date(expiry * 1000).toLocaleString()}</td>
                            <td>{strikePrice} DAI</td>
                            <td>{spotPrice} DAI</td>
                            <td>{totalSupplyLocked} / {totalSupply} DAI ({percentInsured} %)</td>
                            <td>{premium} DAI/BTC</td>

                            <td>
                                <Button variant={'outline-danger'} onClick={() => { this.handleRefund(index) }}
                                    disabled={(expiry >= currentDate)}>
                                    Refund
                            </Button>
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
                            <Row className="text-center">
                                <Badge>
                                    <Col md={4}>
                                        <h3>{this.state.btcInsured}</h3>
                                        <h6>BTC
                            Insured</h6>
                                    </Col>
                                </Badge>
                                <Badge>
                                    <Col md={4}>
                                        <h3>{this.state.totalInsured}</h3>
                                        <h6>DAI Insurance Sold</h6>
                                    </Col>
                                </Badge>
                                <Badge>
                                    <Col md={4}>
                                        <h3>{this.state.totalPremium}</h3>
                                        <h6>DAI Premium Earned</h6>
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
                                        <th>
                                            Action
                                </th>
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