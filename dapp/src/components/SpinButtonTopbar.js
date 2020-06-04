import React from "react";
import { Button, Spinner } from "react-bootstrap";

export class SpinButtonTopbar extends React.Component {

  render() {
    if(!this.props.balance) return "";

    return(
        <Button variant="info" size="sm" disabled={this.props.spinner}>
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