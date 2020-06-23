import React, { Component } from "react";
import { Button, Form } from "react-bootstrap";
import * as utils from '../utils/utils';
import { SpinButtonTopbar } from "./SpinButtonTopbar";
import { showSuccessToast, showFailureToast } from '../controllers/toast';
import { toast } from 'react-toastify';
import { Big } from 'big.js';
import { AppPropsLoading } from "../types/App";

interface State {
    loaded: boolean,
    spinner: boolean,
    balance: Big,
}

export default class BalanceTopbar extends Component<AppPropsLoading, State> {
    state: State = {
        loaded: false,
        spinner: false,
        balance: utils.newBig(0),
    }

    async updateBalance() {
        if (this.props.contracts) {
            let balance = await this.props.contracts.balanceOf();
            this.setState({
                loaded: true,
                balance: utils.weiDaiToDai(utils.newBig(balance.toString())),
            })
        }
    }

    async componentDidUpdate() {
        if (!this.state.loaded && this.props.contracts) {
            await this.updateBalance();
        }
    }

    handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        this.setState({ spinner: true });
        try {
            if (this.props.contracts) {
                let contracts = this.props.contracts;
                await contracts.mint();
            }
        } catch (error) {
            console.log(error);
            showFailureToast(toast, 'Something went wrong. We were unable to send you testnet DAI. Please try again later.', 3000);
        }
        showSuccessToast(toast, 'Testnet DAI Sent', 3000);
        this.setState({ spinner: false });
        await this.updateBalance();
    }

    render() {
        if (this.props.isLoggedIn && this.props.address) {
            return (
                <React.Fragment>
                    <Form onSubmit={this.handleSubmit}>
                        <SpinButtonTopbar text="Get Testnet DAI" balance={this.state.balance} spinner={this.state.spinner} />
                    </Form>
                    &nbsp;
                    <a href="https://faucet.ropsten.be/" target="__blank">
                    <Button variant="outline-dark" size="sm" >Get Testnet ETH</Button></a>
                    &nbsp;
                    <a href="https://testnet-faucet.mempool.co/" target="__blank">
                    <Button variant="outline-warning" size="sm" >Get Testnet BTC</Button></a>
                </React.Fragment>
            )
        } else return "";
    }
}