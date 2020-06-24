import React, { Component } from "react";
import { Col, Row, Table, Card, Spinner, Modal, Button } from "react-bootstrap";
import * as utils from '../utils/utils';
import BuyWizard from './wizards/Buy';
import SellWizard from './wizards/Sell';
import CreateWizard from './wizards/Create';
import { ButtonTool } from "./ButtonTool";
import { ToastContainer, toast } from 'react-toastify';
import { AppProps } from "../types/App";
import { Big } from 'big.js';

interface State {
    loaded: boolean
    options: {
        expiry: number;
        premium: Big;
        strikePrice: Big;
        totalSupply: Big;
        totalSupplyLocked: Big;
        totalSupplyUnlocked: Big;
        hasSellers: boolean;
        spotPrice: number;
        contract: string;    
    }[],
    totalInsured: Big,
    insuranceAvailable: Big,
    avgPremium: Big,
    showBuy: boolean,
    showSell: boolean,
    showCreateModal: boolean,
    buy: string,
    sell: string,
}

export default class OptionList extends Component<AppProps, State> {
    state: State = {
        loaded: false,
        options: [],
        totalInsured: utils.newBig(0),
        insuranceAvailable: utils.newBig(0),
        avgPremium: utils.newBig(0),
        showBuy: false,
        showSell: false,
        showCreateModal: false,
        buy: '',
        sell: ''
    }

    constructor(props: AppProps) {
        super(props);

        this.showBuy = this.showBuy.bind(this);
        this.showSell = this.showSell.bind(this);
        this.showCreateModal = this.showCreateModal.bind(this);

        this.hideBuy = this.hideBuy.bind(this);
        this.hideSell = this.hideSell.bind(this);
        this.hideCreateModal = this.hideCreateModal.bind(this);

        this.reloadOptions = this.reloadOptions.bind(this);
    }

    componentDidUpdate() {
        if (this.state.loaded === false) {
            this.getOptions();
        }
    }

    async getOptions() {
        if (this.props.contracts) {
            let optionContracts = await this.props.contracts.getOptions();
            let options = await this.getOptionDetails(optionContracts);
            this.setState({
                loaded: true,
                options: options
            });
        }
    }

    async getOptionDetails(optionContracts: string[]) {

        let options = [];
        var index;
        let insuranceAvailable = utils.newBig(0);
        let totalInsured = utils.newBig(0);
        let totalPremium = utils.newBig(0);
        for (index in optionContracts) {
            let addr = optionContracts[index];
            let optionContract = this.props.contracts.attachOption(addr);
            let optionRes = await optionContract.getDetails();
            let option = {
                expiry: parseInt(optionRes.expiry.toString()),
                premium: utils.weiDaiToBtc(utils.newBig(optionRes.premium.toString())),
                strikePrice: utils.weiDaiToBtc(utils.newBig(optionRes.strikePrice.toString())),
                totalSupply: utils.weiDaiToDai(utils.newBig(optionRes.total.toString())),
                totalSupplyLocked: utils.weiDaiToDai(utils.newBig(optionRes.totalSold.toString())),
                totalSupplyUnlocked: utils.weiDaiToDai(utils.newBig(optionRes.totalUnsold.toString())),
                hasSellers: await optionContract.hasSellers(),
                spotPrice: 0,
                contract: '',
            }
            option.spotPrice = this.props.btcPrices.dai;
            option.contract = addr;
            if (!option.strikePrice.eq(0))
                totalInsured = totalInsured.add(option.totalSupplyLocked.div(option.strikePrice));
            insuranceAvailable = insuranceAvailable.add(option.totalSupplyUnlocked);
            totalPremium = totalPremium.add(option.premium);
            options.push(option);
        }

        this.setState({
            insuranceAvailable: insuranceAvailable,
            totalInsured: totalInsured,
            avgPremium: options.length > 0 ? totalPremium.div(options.length) : utils.newBig(0),
        })

        return options;
    }

    async showBuy(contract: string) {
        if (!this.props.isLoggedIn) {
            await this.props.tryLogIn(true);
        }
        this.setState({
            buy: contract,
            showBuy: true,
        });
    }

    hideBuy() {
        this.setState({
            showBuy: false,
        })
    }

    async showSell(contract: string) {
        if (!this.props.isLoggedIn) {
            await this.props.tryLogIn(true);
        }
        this.setState({
            sell: contract,
            showSell: true,
        });
    }

    hideSell() {
        this.setState({
            showSell: false,
        })
    }

    showCreateModal() {
        this.setState({
            showCreateModal: true,
        })
    }

    hideCreateModal() {
        this.setState({
            showCreateModal: false,
        })
    }

    reloadOptions() {
        this.getOptions();
    }

    renderTableData() {
        if (this.state.loaded) {
            return this.state.options.map((option, index) => {
                const { expiry, premium, strikePrice, spotPrice, totalSupply, totalSupplyLocked, contract } = option;
                const id = utils.btcPutOptionId(expiry, strikePrice.toString());

                let percentInsured = utils.newBig(0);
                if (totalSupply.gt(0)) {
                    percentInsured = (totalSupplyLocked.div(totalSupply)).mul(100);
                }
                let currentDate = Math.floor(Date.now() / 1000);
                
                return (
                    // Hide expired options
                    <tr key={contract} hidden={expiry < currentDate}>

                        <td>{id}</td>
                        <td>{new Date(expiry * 1000).toLocaleString()}
                            {(expiry < currentDate) &&
                                <b> (Expired)</b>
                            }
                        </td>
                        <td>{strikePrice.toString()} DAI/BTC</td>
                        <td>{spotPrice} DAI</td>
                        <td>{totalSupplyLocked.round(0, 0).toString()} / {totalSupply.round(0, 0).toString()} DAI ({percentInsured.toFixed(0)} %)</td>
                        <td>{premium.toString()} DAI/BTC</td>

                        <td>
                            <ButtonTool
                                disable={(expiry < currentDate) || !option.hasSellers}
                                reason={(expiry < currentDate) ? "Expired" : (!option.hasSellers) ? "No Options" : ""}
                                placement={"left"}
                                text={"Buy"}
                                variant={"outline-success"}
                                show={this.showBuy}
                                showValue={contract}
                            />
                            {" "}
                            <ButtonTool
                                disable={(expiry < currentDate)}
                                reason={(expiry < currentDate) ? "Expired" : ""}
                                placement={"right"}
                                text={"Sell"}
                                variant={"outline-danger"}
                                show={this.showSell}
                                showValue={contract}
                            />
                        </td>
                    </tr>
                )
            })
        } else {
            return <tr><td colSpan={7} className="text-center"><Spinner animation="border" /></td></tr>
        }
    }


    render() {
        return (
            <Col xl={{ span: 8, offset: 2 }}>
                <ToastContainer
                    position="bottom-center"
                    autoClose={5000}
                    hideProgressBar={false}
                    newestOnTop={false}
                    closeOnClick
                    rtl={false}
                    pauseOnFocusLoss
                    draggable
                    pauseOnHover
                />
                <Card border="dark">
                    <Card.Header>
                        <Card.Title><h2 className="text-center">BTC/DAI Put Option Contracts</h2>
                            <Row className="text-center">
                                <Col>
                                    <h3>{this.state.totalInsured.round(2, 0).toString()} BTC</h3>
                                    <h6>Insured</h6>
                                </Col>

                                <Col>
                                    <h3>{this.state.insuranceAvailable.round(2, 0).toString()} DAI</h3>
                                    <h6>Insurance Available</h6>
                                </Col>

                                <Col>
                                    <h3>{this.state.avgPremium.round(2, 0).toString()} DAI/BTC</h3>
                                    <h6>Average Premium</h6>
                                </Col>
                            </Row>
                        </Card.Title>
                    </Card.Header>
                    <Card.Body>
                        <Row>
                            <Table hover responsive size={"md"}>
                                <thead>
                                    <tr>
                                        <th>ID</th>
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
                        <Row className="text-center">
                            <Col>
                                <Button className="text-center" variant="success" size="lg" onClick={() => { this.showCreateModal() }}>
                                    Create
                                </Button>
                            </Col>
                        </Row>
                    </Card.Body>
                </Card>
                <Modal
                    size="lg"
                    aria-labelledby="contained-modal-title-vcenter"
                    centered
                    show={this.state.showBuy} onHide={() => this.setState({ showBuy: false })}>
                    <BuyWizard contract={this.state.buy} hide={this.hideBuy} toast={toast} {...this.props}></BuyWizard>
                </Modal>
                <Modal
                    size="lg"
                    aria-labelledby="contained-modal-title-vcenter"
                    centered
                    show={this.state.showSell} onHide={() => this.setState({ showSell: false })}>
                    <SellWizard contract={this.state.sell} hide={this.hideSell} toast={toast} {...this.props}></SellWizard>
                </Modal>
                <CreateWizard 
                    toast={toast}
                    hideModal={this.hideCreateModal}
                    showModal={this.state.showCreateModal}
                    reloadOptions={this.reloadOptions}
                    {...this.props}>
                </CreateWizard>
            </Col>
        )
    }
}