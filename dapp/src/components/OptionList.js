import React, { Component } from "react";
import { Col, Container, Row, Table, Button, } from "react-bootstrap";
import { Redirect } from "react-router-dom";
import { ethers } from 'ethers';

import putOptionArtifact from "./../artifacts/PutOption.json"

export default class OptionList extends Component {

    constructor(props) {
        super(props);
        this.state = {
            loaded: false,
            options: [],
            totalInsured: 0,
            insuranceAvailable: 0,
            totalVolume: 750000,
            buy: null,
            sell: null
        };
    }


    componentDidUpdate() {
        if (this.state.loaded == false) {
            this.getOptions();
        }
    }

    async getOptions() {
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
            this.state.totalInsured += option.totalSupplyLocked;
            this.state.insuranceAvailable += option.totalSupplyUnlocked;
            this.state.totalVolume += option.totalSupply;
            options.push(option);
        }

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

    handleBuy = (contract) => {
        this.setState({
            buy: contract
        })
    }

    handleSell(contract) {
        this.setState({
            sell: contract
        })
    }

    renderTableData() {
        if (this.state.loaded) {
            return this.state.options.map((option, index) => {
                const { expiry, premium, strikePrice, spotPrice, totalSupply, totalSupplyLocked, totalSupplyUnlocked, contract } = option;
                
                let percentInsured = 0;
                if(totalSupply > 0) {
                    percentInsured = Math.round(10000*  totalSupplyLocked / totalSupply) / 100;
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
        if (this.state.buy) return <Redirect to={"/buy/" + this.state.buy} />
        if (this.state.sell) return <Redirect to={"/sell/" + this.state.sell} />
        return <Container>
            <Col lg={{ span: 12 }}>
                <Row>
                    <h2>BTC/DAI Put Option Contracts</h2>
                </Row>
                <Row>
                    <Col md={4}>
                        <b>{this.state.totalInsured}</b> BTC
                            Insured
                    </Col>
                    <Col md={4}>
                        <b>{this.state.insuranceAvailable}</b> DAI
                            Insurance Available
                    </Col>
                    <Col md={4}>
                        <b>{this.state.totalVolume}</b> BTC
                            Traded Volume
                    </Col>
                </Row>
                <Row>
                    <Table hover responsive="sm">
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
            </Col>
        </Container >;
    }



    getDummyOptions() {
        return [
            {
                expiry: 1591012800,
                premium: 10,
                strikePrice: 9250,
                btcAddresses: {
                    "0x1CF8f0A193eeA288014c7513eA6Aa65e6997D8bE": "0xtb1qtypzfss4558ml9j5v3fu90jtd6xlxmq4ltmvp9"
                },
                insured: 0.006,
                premiumEarned: 100,
                collateral: 5000
            },
            {
                expiry: 1590795000,
                premium: 15,
                strikePrice: 9000,
                btcAddress: {
                    "0x1CF8f0A193eeA288014c7513eA6Aa65e6997D8bE": "0xtb1qtypzfss4558ml9j5v3fu90jtd6xlxmq4ltmvp9"
                },
                insured: 0.01,
                premiumEarned: 150,
                collateral: 7850
            },
            {
                expiry: 1590148800,
                premium: 5,
                strikePrice: 10000,
                btcAddress: {
                    "0x1CF8f0A193eeA288014c7513eA6Aa65e6997D8bE": "0xtb1qtypzfss4558ml9j5v3fu90jtd6xlxmq4ltmvp9"
                },
                insured: 1.2,
                premiumEarned: 500,
                collateral: 540
            },
            {
                expiry: 1590018300,
                premium: 11,
                strikePrice: 8909,
                btcAddress: {
                    "0x1CF8f0A193eeA288014c7513eA6Aa65e6997D8bE": "0xtb1qtypzfss4558ml9j5v3fu90jtd6xlxmq4ltmvp9"
                },
                insured: 4.975123,
                premiumEarned: 7700,
                collateral: 9700
            }
        ]
    }
}

