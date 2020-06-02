import React, { Component } from "react";
import { Dropdown, DropdownButton, Modal, Button, ListGroup, ListGroupItem, FormGroup, Form } from "react-bootstrap";
import { SpinButton } from "./SpinButton";
import { showSuccessToast, showFailureToast } from '../controllers/toast';
import { ethers } from "ethers";

class ExerciseModal extends Component {
    constructor(props) {
        super(props);

        this.state = {
            spinner: false,
        };
    }

    handleSubmit = async (event) => {
        event.preventDefault();
        const { contract, recipient, height, index, txid, proof, rawtx } = this.props.tx;
        this.setState({spinner: true});
        try {
            let id = ethers.utils.sha256("0x" + txid);
            await this.props.contracts.exerciseOption(contract, recipient, height, index, id, proof, rawtx);
            showSuccessToast(this.props.toast, 'Success!', 3000);
            this.props.storage.removePendingOption(this.props.index);
            this.props.hide();
            this.forceUpdate();
            this.props.reloadPurchased();
        } catch (error) {
            console.log(error);
            showFailureToast(this.props.toast, 'Failed to send transaction...', 3000);
        }
        this.setState({spinner: false});
    }

    render() {
        if (!this.props.tx) return null;
        return (
            <Modal
                size="lg"
                aria-labelledby="contained-modal-title-vcenter"
                centered
                show={this.props.show} onHide={() => this.props.hide()}>
                <Modal.Header closeButton>
                    <Modal.Title id="contained-modal-title-vcenter">
                        Confirm Exercise
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
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
                </Modal.Body>
            </Modal>
        )
    }
}

export default class UserPending extends Component {
    constructor(props) {
        super(props);
        this.state = {
            loaded: false,
            showModal: false,
            tx: null,
            index: 0,
        };

        this.hideModel = this.hideModel.bind(this)
    }

    async componentDidUpdate() {
        if (this.props.storage && this.props.btcProvider && !this.state.loaded) {
            this.setState({
                loaded: true
            });
        }
    }

    async showModal(tx, index) {
        let txid = tx.txid;
        let status;
        let proof;
        let rawtx;
        
        try {
            status = await this.props.btcProvider.getStatusTransaction(txid);
            proof = await this.props.btcProvider.getMerkleProof(txid);
            rawtx = await this.props.btcProvider.getRawTransaction(txid);
        } catch(error) {
            console.log(error);
            showFailureToast(this.props.toast, 'Error fetching transaction...', 3000);
            return;
        }

        var proofRaw = proof.merkle.reduce(function(prev, curr) {
            return prev.concat(curr);
        });

        this.setState({
            showModal: true,
            tx: {
                txid: txid,
                amountBtc: tx.amountBtc,
                contract: tx.option,
                recipient: tx.recipient,
                confirmations: status.confirmations,
                height: proof.block_height,
                index: proof.pos,
                proof: ethers.utils.toUtf8Bytes(proofRaw),
                rawtx: rawtx,
            },
            index: index,
        });
    }

    hideModel() {
        this.setState({
            showModal: false,
        })
    }

    loadPending() {     
        if (this.state.loaded) {
            let options = this.props.storage.getPendingOptions();
            return options.map((pendingOption, index) => {
                if (!pendingOption) return null;
                const { amountBtc, recipient, option, txid, confirmations } = pendingOption;
                
                return <Dropdown.Item key={txid} onClick={() => this.showModal({amountBtc, recipient, option, txid, confirmations}, index)}>{amountBtc} BTC - {recipient}</Dropdown.Item>
            });
        }
    }

    render() {
        return (
            <div>
                <DropdownButton title="Pending">
                    {this.loadPending()}
                </DropdownButton>
                <ExerciseModal 
                    {...this.props}
                    hide={this.hideModel}
                    reloadPurchased={this.props.reloadPurchased}
                    show={this.state.showModal}
                    tx={this.state.tx}
                    index={this.state.index}
                />
            </div>
        );
    }
}
