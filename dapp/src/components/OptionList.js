import React, { Component } from "react";
import { Col, Container, Row, Table } from "react-bootstrap";
import { ethers } from 'ethers';

import putOptionArtifact from "./../artifacts/PutOption.json"

export default class OptionList extends Component {
  
    constructor(props) {
      super(props);
      this.state = {
        loaded: false,
        optionContracts: [],
        options: []
      };
    }
  
  
    componentDidUpdate() {
      if(this.state.loaded == false){
        this.getOptions();
      }
      console.log(this.state.optionContracts);
    }
  
    async getOptions() {
      let optionContracts = await this.props.optionPoolContract.getOptions();
    
      let optionPoolAbi = putOptionArtifact.abi;

      let options = [];
      var addr;
      for (addr in optionContracts) {
        let optionContract = await new ethers.Contract(addr, putOptionArtifact.abi, this.props.provider);
        console.log(optionContract);

    }
      this.setState({
        optionContracts : optionContracts,
        loaded: true,
        options: []
      });
      this.state.optionsContracts = optionContracts;
    }
  
    renderTableData() {
  
    }
    render() {
        return <Container className="p-3">
            <Row>
              <h2>Latest Option Contracts</h2>
            </Row>
            <Row>
              <Table striped bordered hover>
                <thead>
                  <tr>
                    <th>Timestamp</th>
                    <th>Status</th>
                    <th>Total</th>
                    <th>ID</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td colSpan="5">Error...</td>
                  </tr>
                </tbody>
              </Table>
            </Row>
          </Container>;
    }
  }
  