import React, { Component } from "react";
import { Col, Badge, Row, Table, Button, Card, Spinner, Modal } from "react-bootstrap";
import { Redirect } from "react-router-dom";
import { ethers } from 'ethers';



export default class UserPurchasedOptions extends Component {

    constructor(props) {
        super(props);
        this.state = {
            purchasedLoaded: false,
            purchasedOptions: [],
            totalInsured: 0,
            insuranceAvailable: 0,
            totalPremium: 0,
        };
    }


    componentDidUpdate() {
        if (this.props.optionPoolContract && this.props.address) {
            if (!this.state.purchasedLoaded) {
                this.getAvailableOptions();
            }
            if (!this.state.soldLoaded) {
                this.getCurrentOptions();
            }
        }
    }

    async getAvailableOptions() {
        if (this.props.optionPoolContract && this.props.address) {
            let optionContracts = await this.props.optionPoolContract.getUserPurchasedOptions(this.props.address);
            let purchasedOptions = await this.getOptions(optionContracts)
            this.setState({
                purchasedOptions: purchasedOptions,
                purchasedLoaded: true
            });
        }
    }

    async getCurrentOptions() {
        if (this.props.optionPoolContract && this.props.address) {
            let optionContracts = await this.props.optionPoolContract.getUserSoldOptions(this.props.address);
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
        for (var i = 0; i < optionContracts[0].length; i++) {
            let optionRes = await this.getOptionDetails(optionContracts[0][i]);
            let option = {
                expiry: parseInt(optionRes[0]._hex),
                premium: parseInt(optionRes[1]._hex),
                strikePrice: parseInt(optionRes[2]._hex),
                totalSupply: parseInt(optionRes[3]._hex),
                totalSupplyLocked: parseInt(optionRes[4]._hex),
            }
            console.log(this.props.btcPrices.dai);
            option.spotPrice = this.props.btcPrices.dai;
            option.contract = optionContracts[0][i];
            options.push(option);
        }

        // TODO: remove dummy data
        var index;
        options = this.getDummyOptions();
        for (index in options){
            options[index].spotPrice = this.props.btcPrices.dai;
            options[index].contract = optionContracts[0][i];
        }
        return options;
    }


    handleExercise(contract){
        // TODO: handle exercise
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
                            <td>{new Date(expiry*1000).toLocaleString()}</td>
                            <td>{strikePrice} DAI</td>
                            <td>{spotPrice} DAI</td>
                            <td>{totalSupplyLocked} / {totalSupply} DAI ({percentInsured} %)</td>
                            <td>{premium} DAI/BTC</td>

                            <td>
                                <Button variant="outline-success" onClick={() => { this.handleExercise(contract) }}>
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


    render() {
        return <Col xl={{ span: 8, offset: 2 }}>
            <Card border="dark">
                <Card.Header>
                    <Card.Title><h2>Purchased BTC/DAI Put Option Contracts</h2>
                        <Row className="text-center">
                            <Badge>
                                <Col md={4}>
                                    <h3>{this.state.totalInsured}</h3>
                                    <h6>BTC
                            totalSupplyLocked</h6>
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
        </Col>;
    }

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
    
}