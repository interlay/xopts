import React, { Component } from "react";
import { Col, Badge, Row, Table, Button, Card, Spinner, Modal, ListGroup, ListGroupItem, FormGroup, FormControl } from "react-bootstrap";
import { Redirect } from "react-router-dom";
import { ethers } from 'ethers';
import putOptionArtifact from "./../artifacts/PutOption.json"
import { ToastContainer, toast } from 'react-toastify';



class SelectSeller extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            loaded: false,
            sellers: [],
            options: [],
        };
    }

    async componentDidMount() {
        console.log(this.props);
        if (this.props.contract && !this.state.loaded) {
            let optionContract = await new ethers.Contract(this.props.contract, putOptionArtifact.abi, this.props.signer);
            let [sellers, options] = await optionContract.getOptionSellers();
            this.setState({
                loaded: true,
                sellers: sellers,
                options: options,
            });
        }
    }

    renderOptions() {
        return this.state.sellers.map((seller, index) => {
            let address = seller.toString();
            let amount = this.state.options[index].toNumber();
            return (
                <option key={address} value={address} onClick={() => this.props.updateAmount(amount)}>{address} - {amount}</option>
            );
        })
    }

    render() {
        if (this.props.currentStep !== 1) { // Prop: The current step
            return null
        }
        return (
            <FormGroup>
                <h5>Select Seller</h5>
                <select name="seller" defaultValue="default" onChange={this.props.handleChange}>
                    <option disabled value="default"> -- Select -- </option>
                    {this.renderOptions()}
                </select>
            </FormGroup>
        )
    }
}

class EnterAmount extends React.Component {
    constructor(props) {
        super(props);
    }

    render() {
        if (this.props.currentStep !== 2) {
            return null
        }
        return (
            <FormGroup>
                <h5>Enter Amount (BTC)</h5>
                <FormControl
                    id="amount"
                    name="amount"
                    type="number"
                    placeholder="Amount"
                    max={this.props.amount}
                    defaultValue={this.props.amount}
                    onChange={this.props.handleChange}
                />
            </FormGroup>
        )
    }
}

class Confirm extends React.Component {
    constructor(props) {
        super(props);
    }

    render() {
        if (this.props.currentStep !== 3) {
            return null
        }
        return (
            <FormGroup>
                <h5>Confirm & Pay</h5>
                <FormGroup>
                    <ListGroup>
                        <ListGroupItem>{this.props.seller}</ListGroupItem>
                        <ListGroupItem>{this.props.amount} BTC</ListGroupItem>
                    </ListGroup>
                </FormGroup>
                <button className="btn btn-success btn-block">Pay</button>
            </FormGroup>
        )
    }
}


export default class UserPurchasedOptions extends Component {

    constructor(props) {
        super(props);
        this.state = {
            purchasedLoaded: false,
            purchasedOptions: [],
            totalInsured: 0,
            insuranceAvailable: 0,
            totalPremium: 0,
            showExercise: false,
            exerciseOption: {},
            currentStep: 1
        };


        this.handleChange = this.handleChange.bind(this)
        this.updateAmount = this.updateAmount.bind(this)
    }


    componentDidUpdate() {
        if (this.props.optionPoolContract && this.props.address) {
            if (!this.state.purchasedLoaded) {
                this.getAvailableOptions();
            }
            if (!this.state.soldLoaded) {
                this.getCurrentOptions();
            }
        }
    }

    async getAvailableOptions() {
        if (this.props.optionPoolContract && this.props.address) {
            let optionContracts = await this.props.optionPoolContract.getUserPurchasedOptions(this.props.address);
            let purchasedOptions = await this.getOptions(optionContracts)
            this.setState({
                purchasedOptions: purchasedOptions,
                purchasedLoaded: true
            });
        }
    }

    async getCurrentOptions() {
        if (this.props.optionPoolContract && this.props.address) {
            let optionContracts = await this.props.optionPoolContract.getUserSoldOptions(this.props.address);
            let soldOptions = await this.getOptions(optionContracts)
            this.setState({
                soldOptions: soldOptions,
                soldLoaded: true
            });
        }
    }

    async getOptions(optionContracts) {

        // Remove 0-value contracts
        for (var i = optionContracts[1].length - 1; i >= 0; i--) {
            if (parseInt(optionContracts[1][i]._hex) == 0) {
                optionContracts[0].splice(i, 1);
                optionContracts[1].splice(i, 1);
            }
        }

        let options = [];
        try {
            for (var i = 0; i < optionContracts[0].length; i++) {
                let addr = optionContracts[0][i];
                let optionContract = await new ethers.Contract(addr, putOptionArtifact.abi, this.props.provider);
                let optionRes = await optionContract.getOptionDetails(); let option = {
                    expiry: parseInt(optionRes[0]._hex),
                    premium: parseInt(optionRes[1]._hex),
                    strikePrice: parseInt(optionRes[2]._hex),
                    totalSupply: parseInt(optionRes[3]._hex),
                    totalSupplyLocked: parseInt(optionRes[4]._hex),
                }
                option.spotPrice = this.props.btcPrices.dai;
                option.contract = optionContracts[0][i];
                options.push(option);
            }

            // TODO: remove dummy data
            /*
            var index;
            options = this.getDummyOptions();
            for (index in options) {
                options[index].spotPrice = this.props.btcPrices.dai;
                options[index].contract = optionContracts[0][i];
            }
            */
        } catch (error) {
            console.log(error);
        }
        return options;
    }


    renderTableData() {
        if (this.state.purchasedLoaded) {
            if (this.state.purchasedOptions.length > 0) {
                return this.state.purchasedOptions.map((option, index) => {
                    const { expiry, premium, strikePrice, spotPrice, totalSupply, totalSupplyLocked, totalSupplyUnlocked, contract } = option;

                    let percentInsured = 0;
                    if (totalSupply > 0) {
                        percentInsured = Math.round(10000 * totalSupplyLocked / totalSupply) / 100;
                    }
                    return (
                        <tr key={strikePrice}>
                            <td>{new Date(expiry * 1000).toLocaleString()}</td>
                            <td>{strikePrice} DAI</td>
                            <td>{spotPrice} DAI</td>
                            <td>{totalSupplyLocked} / {totalSupply} DAI ({percentInsured} %)</td>
                            <td>{premium} DAI/BTC</td>

                            <td>
                                <Button variant="outline-success" onClick={() => { this.handleExercise(index) }}>
                                    Exercise
                                </Button>
                            </td>
                        </tr>
                    )
                })
            } else {
                return <tr><td colSpan="7">No options purchased yet</td></tr>
            }
        } else {
            return <tr><td colSpan="7" className="text-center"><Spinner animation="border" /></td></tr>
        }
    }

    handleExercise(index) {
        this.setState({
            exerciseOption: this.state.purchasedOptions[index],
            showExercise: true
        });
    }

    handleChange(event) {
        const { name, value } = event.target
        this.setState({
            [name]: value
        });
    }

    updateAmount(i) {
        this.setState({
            amount: i
        });
    }

    async doExercise() {
        try {
            let optionContract = await new ethers.Contract(this.state.exerciseOption.contract, putOptionArtifact.abi, this.props.signer);
            optionContract.refund();
            toast.success('Refund successful!', {
                position: "top-center",
                autoClose: 3000,
                hideProgressBar: false,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
                progress: undefined,
            });
        } catch (error) {
            console.log(error);
            toast.error('Oops.. Something went wrong!', {
                position: "top-center",
                autoClose: 3000,
                hideProgressBar: false,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
                progress: undefined,
            });
        }
        this.setState({
            exerciseOption: {},
            showExercise: false,
        });

    }

    cancelRefund() {
        this.setState({
            exerciseOption: {},
            showExercise: false
        });
    }

    _next() {
        console.log(this.state);
        let currentStep = this.state.currentStep;
        // If the current step is 1 or 2, then add one on "next" button click
        currentStep = currentStep >= 2 ? 3 : currentStep + 1;
        this.setState({
            currentStep: currentStep
        })
    }

    _prev() {
        let currentStep = this.state.currentStep
        // If the current step is 2 or 3, then subtract one on "previous" button click
        currentStep = currentStep <= 1 ? 1 : currentStep - 1
        this.setState({
            currentStep: currentStep
        })
    }

    get previousButton() {
        let currentStep = this.state.currentStep;
        // If the current step is not 1, then render the "previous" button
        if (currentStep !== 1) {
            return (
                <button
                    className="btn btn-secondary float-left"
                    type="button" onClick={this._prev}>
                    Previous
                </button>
            )
        }
        // ...else return nothing
        return null;
    }

    get nextButton() {
        let currentStep = this.state.currentStep;
        // If the current step is not 3, then render the "next" button
        if (currentStep < 3) {
            return (
                <button
                    className="btn btn-primary float-right"
                    type="button" onClick={this._next}>
                    Next
                </button>
            )
        }
        // ...else render nothing
        return null;
    }


    render() {
        return <div>
            <ToastContainer
                position="top-center"
                autoClose={5000}
                hideProgressBar={false}
                newestOnTop={false}
                closeOnClick
                rtl={false}
                pauseOnFocusLoss
                draggable
                pauseOnHover
            />
            <Col xl={{ span: 8, offset: 2 }}>
                <Card border="dark">
                    <Card.Header>
                        <Card.Title><h2>Purchased BTC/DAI Put Option Contracts</h2>
                            <Row className="text-center">
                                <Badge>
                                    <Col md={4}>
                                        <h3>{this.state.totalInsured}</h3>
                                        <h6>BTC
                            totalSupplyLocked</h6>
                                    </Col>
                                </Badge>
                                <Badge>
                                    <Col md={4}>
                                        <h3>{this.state.totalPremium}</h3>
                                        <h6>DAI Premium Paid</h6>
                                    </Col>
                                </Badge>
                            </Row>
                        </Card.Title>
                    </Card.Header>
                    <Card.Body>
                        <Row>
                            <Table hover responsive>
                                <thead>
                                    <tr>
                                        <th>Expiry</th>
                                        <th>Strike Price</th>
                                        <th>Current Price</th>
                                        <th>Insurance Issued</th>
                                        <th>Premium</th>
                                        <th>
                                            Action
                                </th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {this.renderTableData()}
                                </tbody>
                            </Table>
                        </Row>

                    </Card.Body>
                </Card>
                <div className="wizard-container">

                    <Modal
                        size="lg"
                        aria-labelledby="contained-modal-title-vcenter"
                        centered
                        show={this.state.showExercise} onHide={() => this.setState({ showExercise: false })}>
                        <Modal.Header closeButton>
                            <Modal.Title id="contained-modal-title-vcenter">
                                Exercise Option
                    </Modal.Title>
                        </Modal.Header>

                        <form onSubmit={this.doExercise}>
                            <Modal.Body>
                                <SelectSeller
                                    currentStep={this.state.currentStep}
                                    handleChange={this.handleChange}
                                    updateAmount={this.updateAmount}
                                    seller={this.state.seller}
                                    amount={this.state.amount}
                                    contract={this.state.exerciseOption.contract}
                                    signer = {this.props.signer}
                                />
                                <EnterAmount
                                    currentStep={this.state.currentStep}
                                    handleChange={this.handleChange}
                                    amount={this.state.amount}
                                />
                                <Confirm
                                    currentStep={this.state.currentStep}
                                    handleChange={this.handleChange}
                                    seller={this.state.seller}
                                    amount={this.state.amount}
                                />

                            </Modal.Body>
                            <Modal.Footer>
                                {this.previousButton}
                                {this.nextButton}
                                <Button onClick={() => this.doRefund()}>Refund</Button>
                                <Button variant="danger" onClick={() => this.cancelRefund()}>Cancel</Button>
                            </Modal.Footer>
                        </form>

                    </Modal>
                </div>
            </Col>
        </div>;
    }

    /*
    getDummyOptions() {
        return [
            {
                expiry: 1591012800,
                premium: 10,
                strikePrice: 9250,
                totalSupplyLocked: 450,
                totalSupply: 5000,
                premium: 100,

            },
            {
                expiry: 1590795000,
                premium: 15,
                strikePrice: 9000,
                totalSupplyLocked: 4532,
                premium: 150,
                totalSupply: 7850
            },
            {
                expiry: 1590148800,
                premium: 5,
                strikePrice: 10000,
                totalSupplyLocked: 120,
                premium: 500,
                totalSupply: 540
            },
            {
                expiry: 1590018300,
                premium: 11,
                strikePrice: 8909,
                totalSupplyLocked: 6543,
                premium: 7700,
                totalSupply: 9700
            }
        ]
    }
    */

}