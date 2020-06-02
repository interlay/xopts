import React from "react";
import { FormGroup, Button, Spinner } from "react-bootstrap";

export class SpinButton extends React.Component {
    constructor(props) {
      super(props);
    }
  
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