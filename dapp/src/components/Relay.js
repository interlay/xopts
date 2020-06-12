import React, { Component } from "react";
import { withRouter, Link } from 'react-router-dom'
import { Badge } from "react-bootstrap";

class Relay extends Component {
    constructor(props) {
        super(props);
        this.state = {
            loaded: false,
            relayHeight: "0",
            relayAddress: "",
            blockstreamHeight: "0",
        };
    }

    async updateBlockHeights() {
        let relayHeight = await this.props.contracts.getRelayHeight();
        let blockstreamHeight = await this.props.btcProvider.getBlockHeight();
        this.setState({
            relayHeight: relayHeight.toString(),
            relayAddress: this.props.contracts.relayContract.address,
            blockstreamHeight: blockstreamHeight.toString(),
        });
    }

    async componentDidMount() {
        if (this.props.contracts && this.props.btcProvider) {
            await this.updateBlockHeights();
            this.setState({loaded: true});
            this.interval = setInterval(() => this.updateBlockHeights(), 5000);
        }
    }

    componentWillUnmount() {
        clearInterval(this.interval);
    }

    render() {
        if (!this.state.loaded) return (
            <h5><Badge variant="success">Relay / Testnet Height</Badge></h5>  
        );
        return (
            <h5>
                <a href={"https://ropsten.etherscan.io/address/" + this.state.relayAddress}>
                    <Badge variant="success">{this.state.relayHeight} / {this.state.blockstreamHeight} - (Relay / Testnet Height)</Badge>
                </a>
            </h5>
        )
    }
}

export default withRouter(Relay);