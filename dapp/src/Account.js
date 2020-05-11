import React, { Component } from "react";
import ListGroupItem from "react-bootstrap/ListGroupItem";

class Account extends Component {
  constructor(props) {
    super(props);
  }

  render() {
    const address = this.props.account;
    return <ListGroupItem>{{ address }}</ListGroupItem>;
  }
}

export default Account;
