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
        if (!this.state.loaded) return "";
        let relayDiff = this.state.relayHeight - this.state.blockstreamHeight;
        return (
            <p className="text-muted">
                <a href={"https://ropsten.etherscan.io/address/" + this.state.relayAddress}>
                BTC-Relay status: &nbsp;
                {relayDiff <= 1 ? "online" : (relayDiff <= 6 ? "tailing" : "offline")} 
                &nbsp;
                <Badge pill variant={relayDiff <= 1 ? "success" : (relayDiff <= 6 ? "warning" : "danger")}>&nbsp;</Badge>
                &nbsp;
                (Block height: {this.state.relayHeight} / {this.state.blockstreamHeight})
                </a>
            </p>
        )
    }
}

export default withRouter(Relay);