import React, { Component } from "react";
import { Button, OverlayTrigger, Tooltip } from "react-bootstrap";

interface Props<T> {
    disable: boolean;
    placement: "auto" | "auto-start" | "auto-end" | "top" | "bottom" | "right" | "left" | "top-start" | "top-end" | "bottom-start" | "bottom-end" | "right-start" | "right-end" | "left-start" | "left-end" | undefined;
    reason: string;
    variant:
        | 'primary'
        | 'secondary'
        | 'success'
        | 'danger'
        | 'warning'
        | 'info'
        | 'dark'
        | 'light'
        | 'link'
        | 'outline-primary'
        | 'outline-secondary'
        | 'outline-success'
        | 'outline-danger'
        | 'outline-warning'
        | 'outline-info'
        | 'outline-dark'
        | 'outline-light';
    text: string;
    show: (value: T) => void;
    showValue: T;
}

export class ButtonTool<T> extends Component<Props<T>> {
  
    render() {
      return(
        <React.Fragment>
            {
                this.props.disable ? 
            
                    <OverlayTrigger
                        key={this.props.placement}
                        placement={this.props.placement}
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