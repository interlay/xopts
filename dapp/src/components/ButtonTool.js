import React from "react";
import { FormGroup, Button, OverlayTrigger, Tooltip, Col } from "react-bootstrap";

export class ButtonTool extends React.Component {
    constructor(props) {
      super(props);
    }
  
    render() {
      return(
        <React.Fragment>
            {
                this.props.disable ? 
            
                    <OverlayTrigger
                        key={this.props.placement}
                        placement={this.props.placement}
                        hide={true}
                        overlay={
                            <Tooltip id={`tooltip-${this.props.placement}`}>
                                {
                                    this.props.reason
                                }
                            </Tooltip>
                        }
                    >
                        <Button disabled variant={this.props.variant}>
                            { this.props.text }
                        </Button>
                    </OverlayTrigger>

                    : 

                    <Button variant={this.props.variant} onClick={() => { this.props.show(this.props.showValue) }}>
                        { this.props.text }
                    </Button>
                }
        </React.Fragment>
      )
    }
}