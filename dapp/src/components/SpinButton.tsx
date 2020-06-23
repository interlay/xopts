import React, { Component } from "react";
import { FormGroup, Spinner } from "react-bootstrap";

interface Props {
  spinner: boolean
  text?: string
}

export class SpinButton extends Component<Props> {
  render() {
    return(
      <FormGroup>
        <button className="btn btn-success btn-block" disabled={this.props.spinner}>
        { this.props.spinner ? 
          <Spinner
            as="span"
            animation="border"
            size="sm"
            role="status"
            aria-hidden="true"
          /> : this.props.text || "Confirm"}
        </button>
      </FormGroup>
    )
    }
}