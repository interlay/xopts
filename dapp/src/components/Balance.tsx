import React, { Component } from "react";
import { withRouter } from 'react-router-dom'
import { Col, Row, Form } from "react-bootstrap";
import * as utils from '../utils/utils'; 
import { SpinButton } from "./SpinButton";
import { AppProps } from "../types/App";
import { Big } from 'big.js';

interface BalanceState {
    loaded: boolean
    spinner: boolean
    balance: Big
}

export default class Balance extends Component<AppProps, BalanceState> {
    state: BalanceState = {
        loaded: false,
        spinner: false,
        balance: utils.newBig(0),
    }

    async updateBalance() {
        let balance = await this.props.contracts.balanceOf();
        this.setState({
            loaded: true,
            balance: utils.weiDaiToDai(utils.newBig(balance.toString())),
        }) 
    }

    async componentDidUpdate() {
        if (this.props.isLoggedIn && !this.state.loaded && this.props.contracts) {
            await this.updateBalance();
        }
    }

    handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        this.setState({spinner: true});
        try {
          let contracts = this.props.contracts;
          await contracts.mint();
        } catch(error) {
          console.log(error);
        }
        this.setState({spinner: false});
        await this.updateBalance();
    }

    render() {
        if(this.props.isLoggedIn && this.props.address){
        return (
            <React.Fragment>
                <Row className="text-center">
                    <Col>
                        <h5>{this.state.balance.round(2, 0).toString()} DAI</h5>
                    </Col>
                    <Col>
                        <Form onSubmit={this.handleSubmit}>
                            <SpinButton text="Get Testnet DAI" spinner={this.state.spinner}/>
                        </Form>
                    </Col>
                </Row>
            </React.Fragment>
        )
        } else return "";
    }
}