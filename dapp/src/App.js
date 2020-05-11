import React from "react";

import Jumbotron from "react-bootstrap/Jumbotron";
import Container from "react-bootstrap/Container";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";
import Image from "react-bootstrap/Image";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Tab from "react-bootstrap/Tab";
import ListGroup from "react-bootstrap/ListGroup";
import Balance from './Balance';

const App = () => (
  <Container className="p-3">
    <Row>
      <Col md={{ span: 6, offset: 4 }}>
        <Image src="logo.png" className="header p-3" fluid />
      </Col>
    </Row>
    <Jumbotron className="py-4">
      <h1 className="header">XFlash</h1>
    </Jumbotron>
    <Tab.Container id="list-group-tabs-example" defaultActiveKey="#link1">
      <Row>
        <Col sm={4}>
          <ListGroup>
            <ListGroup.Item action href="#link1">
              Account
            </ListGroup.Item>
            <ListGroup.Item action href="#link2">
              Borrow
            </ListGroup.Item>
            <ListGroup.Item action href="#link3">
              Pool
            </ListGroup.Item>
          </ListGroup>
        </Col>
        <Col sm={8}>
          <Tab.Content>
            <Tab.Pane eventKey="#link1">
              <Balance />
            </Tab.Pane>
            <Tab.Pane eventKey="#link2">
              <Form>
                <Form.Group controlId="formBasicEmail">
                  <Form.Label>Wallet Address</Form.Label>
                  <Form.Control type="email" placeholder="Enter address" />
                  <Form.Text className="text-muted">
                    Where you want to pool from.
                  </Form.Text>
                </Form.Group>
                <Form.Group controlId="formBasicPassword">
                  <Form.Label>Amount</Form.Label>
                  <Form.Control type="text" placeholder="1.01" />
                </Form.Group>
                <Form.Group controlId="formBasicCheckbox">
                  <Form.Check type="checkbox" label="I have read the T&C" />
                </Form.Group>
                <Button variant="primary" type="submit">
                  Submit
                </Button>
              </Form>
            </Tab.Pane>
            <Tab.Pane eventKey="#link3">
              <Form>
                <Form.Group controlId="formBasicEmail">
                  <Form.Label>Email address</Form.Label>
                  <Form.Control type="email" placeholder="Enter email" />
                  <Form.Text className="text-muted">
                    We'll never share your email with anyone else.
                  </Form.Text>
                </Form.Group>
                <Form.Group controlId="formBasicPassword">
                  <Form.Label>Password</Form.Label>
                  <Form.Control type="password" placeholder="Password" />
                </Form.Group>
                <Form.Group controlId="formBasicCheckbox">
                  <Form.Check type="checkbox" label="Check me out" />
                </Form.Group>
                <Button variant="primary" type="submit">
                  Submit
                </Button>
              </Form>
            </Tab.Pane>
          </Tab.Content>
        </Col>
      </Row>
    </Tab.Container>
  </Container>
);

export default App;
