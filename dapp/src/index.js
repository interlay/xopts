import React from "react";
import ReactDOM from "react-dom";
import App from "./App";

// Importing Sass with Bootstrap CSS
import "./App.scss";

//import 'bootstrap/dist/css/bootstrap.min.css';
import "./assets/scss/material-kit-react.scss?v=1.8.0";



const ethers = require("ethers");

async function init() {
    await window.ethereum.enable();
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    const network = Number(
        window.ethereum.send({ method: "net_version" }).result
      );
}
ReactDOM.render(<App />, document.getElementById("root"));
