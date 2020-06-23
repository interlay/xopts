import React, { Component } from "react";
import { Button, Spinner } from "react-bootstrap";
import Big from "big.js";

interface Props {
  balance?: Big
  spinner: boolean
  text: string
}

export class SpinButtonTopbar extends Component<Props> {

  render() {
    if(!this.props.balance) return "";

    return (
        <Button type="submit" variant="outline-info" size="sm" disabled={this.props.spinner}>
        { this.props.spinner ? 
          <Spinner
            as="span"
            animation="border"
            size="sm"
            role="status"
            aria-hidden="true"
          /> : "" + this.props.balance.round(2, 0).toString() + " DAI | " +  this.props.text || "Confirm"}
        </Button>
    )
  }
}