import React from "react";

import { BrowserRouter as Router, Switch, Route } from "react-router-dom";

import Dashboard from "./components/Dashboard";
import Home from "./components/Home";
import Topbar from "./components/Topbar";
import Audit from "./xflash/Audit";
import Insure from "./components/Insure";
import Underwrite from "./components/Underwrite";

const App = () => (
  <Router>
    <div>
      <Topbar />
      <Switch>
        <Route path="/underwrite">
          <Underwrite />
        </Route>
        <Route path="/dashboard">
          <Dashboard />
        </Route>
        <Route path="/audit">
          <Audit />
        </Route>
        <Route path="/insure">
          <Insure />
        </Route>
        <Route path="/">
          <Home />
        </Route>
      </Switch>
    </div>
  </Router>
);

export default App;
