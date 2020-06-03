import React from "react";
import { FormGroup, Button, Spinner } from "react-bootstrap";

export class SpinButtonTopbar extends React.Component {
    constructor(props) {
      super(props);
    }
  
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


  /*
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
        */