import React from "react";
import { FormGroup, Spinner } from "react-bootstrap";

export class SpinButton extends React.Component {
  
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