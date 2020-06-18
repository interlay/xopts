import React, { Component } from "react";
import { ListGroup, ListGroupItem, Form, Modal, FormGroup, Image } from "react-bootstrap";
import { showSuccessToast, showFailureToast } from '../controllers/toast';
import { withRouter } from 'react-router-dom';
import { STABLE_CONFIRMATIONS } from "../controllers/bitcoin-data.js";
import { FaTrash, FaChevronRight } from "react-icons/fa";
import { SpinButton } from "./SpinButton.js";
import { endianness } from "os";
import blockstreamImg from "../assets/img/blockstream.png";

const Item = ({ active, children }) => (
    <ListGroup.Item 
        action
        disabled
        className="text-center"
        variant="success"
        active={active}
        variant={active ? "success" : ""}
    >
        {children}
    </ListGroup.Item>
)

class Select extends Component {
    constructor(props) {
        super(props);
        this.state = {
            loaded: false,
        };
    }

    componentDidMount() {
        if (this.props.storage && this.props.btcProvider && !this.state.loaded) {
            this.setState({
                loaded: true
            });
        }
    }

    removePendingOption(option, txid) {
        this.props.storage.removePendingOption(option, txid);
        this.forceUpdate();
    }

    loadPending() {
        if (this.state.loaded) {
            let options = this.props.storage.getPendingTransactionsFor(this.props.contract);
            return options.map((pendingOption, index) => {
                if (!pendingOption) return null;
                const { txid, amountBtc, recipient, optionId, confirmations } = pendingOption;
                const option = this.props.contract;

                return (
                    <ListGroup key={txid + recipient} horizontal>
                        <Item active={confirmations >= STABLE_CONFIRMATIONS}>{optionId}</Item>
                        <Item active={confirmations >= STABLE_CONFIRMATIONS}>{recipient.substring(0, 6)}...{recipient.substring(38)}</Item>
                        <Item active={confirmations >= STABLE_CONFIRMATIONS}>{amountBtc.toString()} BTC</Item>
                        <Item active={confirmations >= STABLE_CONFIRMATIONS}>{confirmations} / {STABLE_CONFIRMATIONS}</Item>

                        <ListGroup.Item
                            action
                            disabled={confirmations < STABLE_CONFIRMATIONS}
                            className="text-center"
                            onClick={() => this.props.exerciseOption({amountBtc, recipient, option, txid, confirmations}, index)}
                        >
                            Confirm <FaChevronRight/>
                        </ListGroup.Item>
                        <ListGroup.Item
                            action
                            className="text-center"
                            onClick={() => this.removePendingOption(option, txid)}
                        >
                            Remove <FaTrash/>
                        </ListGroup.Item>
                    </ListGroup>
                  );
            });
        }
    }

    render() {
        if (this.props.step !== 1) {
            return null
        }
        return (
            <ListGroup>
                <p>We monitor your pending transactions via the <Image src={blockstreamImg}  height="40" /> API, please confirm once ready to finalize the contract.</p>
                {this.loadPending()}
            </ListGroup>
        )
    }
}

class Exercise extends Component {
    constructor(props) {
        super(props);

        this.state = {
            spinner: false,
        };
    }

    componentDidUpdate() {
        if (this.props.storage && this.props.btcProvider && !this.state.loaded) {
            this.setState({
                loaded: true
            });
        }
    }

    handleSubmit = async (event) => {
        event.preventDefault();
        const { contract, recipient, height, index, txid, proof, rawtx } = this.props.tx;
        this.setState({spinner: true});
        try {
            let id = "0x" + Buffer.from(txid, 'hex').reverse().toString('hex');
            await this.props.contracts.exerciseOption(contract, recipient, height, index, id, proof, rawtx);
            showSuccessToast(this.props.toast, 'Success!', 3000);
            this.props.storage.removePendingOption(contract, txid);
            this.props.exitModal();
            this.props.reloadPurchased();
        } catch (error) {
            console.log(error);
            showFailureToast(this.props.toast, 'Failed to send transaction...', 3000);
        }
        this.setState({spinner: false});
    }

    render() {
        if (!this.props.tx) return null;
        if (this.props.step !== 2) return null;
        return (
            <Form onSubmit={this.handleSubmit}>
                <FormGroup>
                    <ListGroup>
                        <ListGroupItem>Transaction ID: <strong>{this.props.tx.txid}</strong></ListGroupItem>
                        <ListGroupItem>Payment: <strong>{this.props.tx.amountBtc} BTC -> {this.props.tx.recipient}</strong></ListGroupItem>
                        <ListGroupItem>Block Height: <strong>{this.props.tx.height}</strong></ListGroupItem>
                        <ListGroupItem>Confirmations: <strong>{this.props.tx.confirmations}</strong></ListGroupItem>
                    </ListGroup>
                </FormGroup>
                <SpinButton spinner={this.state.spinner}/>
            </Form>
        )
    }
}

class ConfWizard extends Component {
    constructor(props) {
        super(props);
        this.state = {
            step: 1,
            tx: {},
            index: 0,
        };

        this.exerciseOption = this.exerciseOption.bind(this);
        this.exitModal = this.exitModal.bind(this);
    }

    async exerciseOption(tx, index) {
        let step = this.state.step;
        step = step + 1;

        let txid = tx.txid;
        let status;
        let proof;
        let rawtx;

        try {
            status = await this.props.btcProvider.getStatusTransaction(txid);
            if (status.confirmed) {
              proof = await this.props.btcProvider.getMerkleProof(txid);
              rawtx = await this.props.btcProvider.getRawTransaction(txid);
            }
        } catch(error) {
            console.log(error);
            showFailureToast(this.props.toast, 'Error fetching transaction...', 3000);
            return;
        }

        let nodes = proof.merkle.map((value) => Buffer.from(value, 'hex').reverse().toString('hex')).join("");

        this.setState({
            step: step,
            tx: {
                txid: txid,
                amountBtc: tx.amountBtc.toString(),
                contract: tx.option,
                recipient: tx.recipient,
                confirmations: status.confirmations,
                height: proof.block_height,
                index: proof.pos,
                proof: "0x" + nodes,
                rawtx: "0x" + rawtx.toString('hex'),
            },
            index: index,
        });
    }

    exitModal() {
        this.props.hide();
        this.setState({step: 1});
    }

    render() {
        return (
            <Modal
                size="xl"
                aria-labelledby="contained-modal-title-vcenter"
                centered
                show={this.props.showConfModal} onHide={() => this.exitModal()}>
                <Modal.Header closeButton>
                    <Modal.Title id="contained-modal-title-vcenter">
                        Verify Payment
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Select
                        step={this.state.step}
                        exerciseOption={this.exerciseOption}
                        {...this.props}
                    />
                    <Exercise
                        step={this.state.step}
                        tx={this.state.tx}
                        index={this.state.index}
                        exitModal={this.exitModal}
                        reloadPurchased={this.props.reloadPurchased}
                        {...this.props}
                    />
                </Modal.Body>
            </Modal>
        )
    }
}

export default withRouter(ConfWizard);
