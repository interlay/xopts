import React, { Component } from "react";
import { showSuccessToast, showFailureToast } from "../controllers/toast";
import { Modal, Button } from "react-bootstrap";

export class RefundModal extends Component {
    async doRefund() {
        try {
            await this.props.contracts.refundOption(this.props.refundOption.contract);
            showSuccessToast(this.props.toast, 'Refund successful!', 3000);
            this.props.hideRefundModal();
            this.props.reloadSold();
        } catch (error) {
            showFailureToast(this.props.toast, 'Oops.. Something went wrong!', 3000);
        }
    }

    render() {
        return (
            <Modal
                size="lg"
                aria-labelledby="contained-modal-title-vcenter"
                centered
                show={this.props.showRefundModal} onHide={() => this.props.hideRefundModal()}>
                <Modal.Header closeButton>
                    <Modal.Title id="contained-modal-title-vcenter">
                        Refund {this.props.refundOption.totalSupplyLocked.toString()} DAI From Option Contract?
                    </Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <p>
                        Are you sure you want to refund this option contract, worth <strong>{this.props.refundOption.totalSupplyLocked.toString()} DAI</strong> to <strong>{this.props.address}</strong>?
                    </p>
                </Modal.Body>
                <Modal.Footer>
                    <Button onClick={() => this.doRefund()}>Refund</Button>
                    <Button variant="danger" onClick={() => this.props.hideRefundModal()}>Cancel</Button>
                </Modal.Footer>
            </Modal>
        );
    }
}