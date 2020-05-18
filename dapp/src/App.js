import React from "react";

import { BrowserRouter as Router, Switch, Route } from "react-router-dom";

import Dashboard from "./Dashboard";
import Home from "./Home";
import Topbar from "./Topbar";
import Audit from "./Audit";
import Insure from "./Insure";
import Underwrite from "./Underwrite";
import Lend from "./Lend";
import Borrow from "./Borrow";

const App = () => (
  <Router>
    <div>
      <Topbar />
      <Switch>
        <Route path="/borrow">
          <Borrow />
        </Route>
        <Route path="/underwrite">
          <Underwrite />
        </Route>
        <Route path="/lend">
          <Lend />
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
