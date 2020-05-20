const express = require("express");
const cors = require("cors");
const ethers = require("ethers");
const fs = require("fs");
const app = express();
const port = 8080;

var bytecode = null;
var abi = null;
var provider = null;
var signer = null;
var factory = null;

async function deploy() {
  bytecode = fs.readFileSync("Voting_sol_Voting.bin").toString();
  abi = JSON.parse(fs.readFileSync("Voting_sol_Voting.abi").toString());
  provider = new ethers.providers.JsonRpcProvider("http://127.0.0.1:7545");
  signer = provider.getSigner(0);
  factory = new ethers.ContractFactory(abi, bytecode, signer);

  let contract = await factory.deploy([
    ethers.utils.formatBytes32String("Alice"),
    ethers.utils.formatBytes32String("Bob"),
    ethers.utils.formatBytes32String("Charlie"),
  ]);
  return contract;
}

let contract = null;

function start() {
  app.use(cors());

  app.get("/deploy", async (req, res) => {
    contract = await deploy();
    res.json("deployed");
  });

  app.get("/accounts", (req, res) => {
    provider
      .listAccounts()
      .then((x) => res.json(x))
      .catch((err) => {
        console.log(err);
        res.json("error");
      });
  });

  app.get("/totalVotes/:name", async (req, res) => {
    const name = req.params.name;
    const amount = await contract.totalVotesFor(
      ethers.utils.formatBytes32String(name)
    );
    res.json(amount.toNumber());
  });

  app.get("/voteFor/:name", async (req, res) => {
    const name = req.params.name;
    contract
      .voteForCandidate(ethers.utils.formatBytes32String(name))
      .then((f) => res.json(f))
      .catch((err) => res.json(err));
  });

  app.get("/", (req, res) => res.send("Hello World!"));

  function testTransaction(id, timestamp, status, total) {
    return {
      id: id,
      timestamp: timestamp,
      status: status,
      total: total,
    };
  }

  function testStat(k, v) {
    return { key: k, val: v };
  }

  app.get("/timeseriesPool", (req, res) => {
    const plot = [
      { time: "2019-04-01", value: 60.01 },
      { time: "2019-04-02", value: 80.01 },
      { time: "2019-04-03", value: 62.01 },
      { time: "2019-04-04", value: 69.01 },
      { time: "2019-04-05", value: 61.01 },
      { time: "2019-04-06", value: 60.01 },
      { time: "2019-04-07", value: 67.01 },
      { time: "2019-04-08", value: 69.01 },
      { time: "2019-04-09", value: 75.01 },
      { time: "2019-04-10", value: 81.01 },
      { time: "2019-04-11", value: 64.01 },
      { time: "2019-04-12", value: 60.01 },
      { time: "2019-04-13", value: 61.01 },
      { time: "2019-04-14", value: 62.01 },
      { time: "2019-04-15", value: 64.01 },
      { time: "2019-04-16", value: 60.01 },
      { time: "2019-04-17", value: 63.01 },
      { time: "2019-04-18", value: 60.01 },
      { time: "2019-04-19", value: 80.01 },
      { time: "2019-04-20", value: 62.01 },
      { time: "2019-04-21", value: 69.01 },
      { time: "2019-04-22", value: 61.01 },
      { time: "2019-04-23", value: 60.01 },
      { time: "2019-04-24", value: 67.01 },
      { time: "2019-04-25", value: 69.01 },
      { time: "2019-04-26", value: 75.01 },
      { time: "2019-04-27", value: 81.01 },
      { time: "2019-04-28", value: 64.01 },
      { time: "2019-04-29", value: 60.01 },
      { time: "2019-04-30", value: 61.01 },
    ];
    res.json(plot);
  });

  app.get("/poolStats", (req, res) => {
    // TODO(jaupe) get the latest transactions from blockchain
    const stats = [
      testStat("Locked", "1209.92 BTC"),
      testStat("Volumn", "109.92 BTC"),
      testStat("Earnings", "10.92 BTC"),
    ];
    res.json(stats);
  });

  app.get("/latestTxs", (req, res) => {
    // TODO(jaupe) get the latest transactions from blockchain
    const transactions = [
      testTransaction(
        "6abe96c9ac613da4fa4ef69045f5a792b9d20305e16a8491775710c66183b343",
        "2020/10/01",
        "minted",
        100
      ),
      testTransaction(
        "6abe96c9ac613da4fa4ef69045f5a792b9d20305e16a8491775710c66183b344",
        "2020/10/02",
        "extended",
        100
      ),
      testTransaction(
        "6abe96c9ac613da4fa4ef69045f5a792b9d20305e16a8491775710c66183b345",
        "2020/10/03",
        "extended",
        100
      ),
    ];
    res.json(transactions);
  });

  app.listen(port, () =>
    console.log(`Example app listening at http://localhost:${port}`)
  );
}

start();
