import React, { Component, useState } from "react";
import { Button, Col, Container, Row, Table, Card, Form } from "react-bootstrap";
import ReactWizard from "react-bootstrap-wizard";
import { Redirect } from "react-router-dom";


class FirstStep extends React.Component {
    constructor(props) {
      super(props);
      this.state = {
        firstStep: "first step here"
      };
    }
    render() {
      return <div>Hey from First</div>;
    }
  }
  class SecondStep extends React.Component {
    constructor(props) {
      super(props);
      this.state = {
        secondStep: "second step here"
      };
    }
    isValidated() {
      // do some validations
      // decide if you will
      return true;
      // or you will
      // return false;
    }
    render() {
      return <div>Hey from Second</div>;
    }
  }
  class ThirdStep extends React.Component {
    constructor(props) {
      super(props);
      this.state = {
        thirdStep: "third step here"
      };
    }
    render() {
      return <div>Hey from Third</div>;
    }
  }
  
  var steps = [
    // this step hasn't got a isValidated() function, so it will be considered to be true
    { stepName: "First", component: FirstStep },
    // this step will be validated to false
    { stepName: "Second", component: SecondStep },
    // this step will never be reachable because of the seconds isValidated() steps function that will always return false
    { stepName: "Third", component: ThirdStep }
  ];
  
export default class Buy extends React.Component {

    constructor(props) {
        super(props);
        this.state = {
            hasContract: true,
        };
    }

    componentDidMount() {
        const { contract } = this.props.match.params;
        //Note: access parent / global web3 state as follows:
         
        console.log(this.props.eth);
    }

    finishButtonClick(allStates) {
      console.log(allStates);
    }
    render() {
        if(!this.state.hasContract) return <Redirect to="/"/>
      return (
        <Container fluid style={{ marginTop: "10em" }}>
          <Row>
            <Col xs={12} md={6} className="mr-auto ml-auto">
              <ReactWizard
                steps={steps}
                title="Buy Option"
                description="Please select the option you would like to purchase."
                headerTextCenter
                validate
                color="primary"
                finishButtonClick={this.finishButtonClick}
              />
            </Col>
          </Row>
        </Container>
      );
    }
  }