import React, { Component } from "react";
import { Col, Badge, Row, Table, Button, Card, } from "react-bootstrap";
import { Redirect } from "react-router-dom";
import { ethers } from 'ethers';

import putOptionArtifact from "./../artifacts/PutOption.json"

export default class UserOptions extends Component {
    constructor(props) {
        super(props);
        this.state = {
            loaded: false,
            boughtOptions: [],
            soldOptions: [],
            totalInsured: 0,
            insuranceAvailable: 0,
            avgPremium: 0,
            buy: null,
            sell: null
        };
    }


    componentDidUpdate() {
        if (this.state.loaded == false) {
            this.getUserOptions();
        }
    }

    async getUserOptions() {
        if (this.props.optionPoolContract) {
            let optionContracts = await this.props.optionPoolContract.getOptions();
            let options = await this.getOptionDetails(optionContracts);
            this.setState({
                loaded: true,
                options: options
            });
        }
    }

    async getOptionDetails(optionContracts) {

        let options = [];
        var index;
        let insuranceAvailable = 0;
        let totalInsured = 0;
        let totalPremium = 0;
        for (index in optionContracts) {
            let addr = optionContracts[index];
            let optionContract = await new ethers.Contract(addr, putOptionArtifact.abi, this.props.provider);
            let optionRes = await optionContract.getOptionDetails();
            let option = {
                expiry: parseInt(optionRes[0]._hex),
                premium: parseInt(optionRes[1]._hex),
                strikePrice: parseInt(optionRes[2]._hex),
                totalSupply: parseInt(optionRes[3]._hex),
                totalSupplyLocked: parseInt(optionRes[4]._hex),
                totalSupplyUnlocked: parseInt(optionRes[5]._hex),
            }
            option.spotPrice = this.props.btcPrices.dai;
            option.contract = addr;
            totalInsured += option.totalSupplyLocked;
            insuranceAvailable += option.totalSupplyUnlocked;
            totalPremium += option.premium;
            options.push(option);
        }

        this.setState({
            insuranceAvailable: insuranceAvailable,
            totalInsured: totalInsured,
            avgPremium: totalPremium / options.length
        })
        /*
        let options = this.getDummyOptions();
        var index;
        for (index in options) {
            options[index].spotPrice = this.props.btcPrices.dai;
            options[index].contract = optionContracts[0];
            this.state.totalInsured += options[index].insured;
            this.state.insuranceAvailable += options[index].collateral;
        }
        */

        return options;
    }
    renderTableData() {
        if (this.state.loaded) {
            return this.state.options.map((option, index) => {
                const { expiry, premium, strikePrice, spotPrice, totalSupply, totalSupplyLocked, totalSupplyUnlocked, contract } = option;

                let percentInsured = 0;
                if (totalSupply > 0) {
                    percentInsured = Math.round(10000 * totalSupplyLocked / totalSupply) / 100;
                }
                return (
                    <tr key={strikePrice}>
                        <td>{expiry}</td>
                        <td>{strikePrice} DAI</td>
                        <td>{spotPrice} DAI</td>
                        <td>{totalSupplyLocked} / {totalSupply} DAI ({percentInsured} %)</td>
                        <td>{premium} DAI/BTC</td>

                        <td>
                            <Button variant="success" onClick={() => { this.handleBuy(contract) }}>
                                Buy
                            </Button>
                            {" "}
                            <Button variant="outline-danger" onClick={() => { this.handleSell(contract) }}>
                                Sell
                            </Button>
                        </td>
                    </tr>
                )
            })
        } else {
            return <tr><td colSpan="7">Loading...</td></tr>
        }
    }


    render() {
        return <Col xl={{ span: 8, offset: 2 }}>
            <Card border="dark">
                <Card.Header>
                    <Card.Title><h2>BTC/DAI Put Option Contracts</h2>
                        <Row className="text-center">
                            <Badge>
                                <Col md={4}>
                                    <h3>{this.state.totalInsured}</h3>
                                    <h6>BTC
                            Insured</h6>
                                </Col>
                            </Badge>
                            <Badge>
                                <Col md={4}>
                                    <h3>{this.state.insuranceAvailable}</h3>
                                    <h6>Insurance Available</h6>
                                </Col>
                            </Badge>
                            <Badge>
                                <Col md={4}>
                                    <h3>{this.state.avgPremium}</h3>
                                    <h6>DAI/BTC
                            Average Premium</h6>
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
}