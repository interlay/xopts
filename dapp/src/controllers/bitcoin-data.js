import { ethers } from 'ethers';


export class BitcoinQuery {

  constructor() {
    this.rootUrl = "https://blockstream.info/api/"
  }


  // Returns a status object with
  // status = {
  //   confirmed: bool,
  //   confirmations: number
  // }
  async getStatusTransaction(txid) {
    let txStatus = {
      confirmed: false,
      confirmations: 0,
    }

    let statusQuery = this.rootUrl.concat("tx/", txid.toString(), "/status");

    let statusResult = await queryToJSON(statusQuery);

    console.log(statusResult);

    txStatus.confirmed = statusResult.confirmed;

    let currentChainTipQuery = this.rootUrl.concat("blocks/tip/height");

    let currentChainTip = await queryToText(currentChainTipQuery);

    console.log(currentChainTip);

    if (statusResult.hasOwnProperty('block_height')) {
      txStatus.confirmations = currentChainTip - statusResult.block_height;
    }

    console.log(txStatus);

    return txStatus;
  }


  // Compatible with BTC core getrawtransaction
  // https://developer.bitcoin.org/reference/rpc/getrawtransaction.html
  // returns a hex encoded rawtx
  async getRawTransaction(txid) {
    let query = this.rootUrl.concat("tx/", txid.toString(), "/raw");

    let rawtx = await queryToArrayBuffer(query);

    console.log(rawtx);

    return rawtx;
  }

  // Gets the Merkle proof including a PoS
  // NOT compatible with bitcoin-core
  // Follows: https://electrumx.readthedocs.io/en/latest/protocol-methods.html#blockchain-transaction-get-merkle
  //
  // returns a proof object with a pos (index) of the transaction
  // proof = {
  //   block_height: number,
  //   merkle: [] hex,
  //   pos: number
  // }
  async getMerkleProof(txid) {
    let query = this.rootUrl.concat("tx/", txid.toString(), "/merkle-proof");

    let proof = await queryToJSON(query);

    console.log(proof);

    return proof;
  }
}

async function query(url) {
  try {
    let response = await fetch(url);

    if (response.ok) {
      return response;
    } else {
      console.log(response.status);
    }
  } catch (error) {
    console.log("Query error");
    console.log(error);
  }
}

async function queryToText(url) {
  let response = await query(url);
  let text = await response.text();
  return text;
}

async function queryToJSON(url) {
  let response = await query(url);
  let json = await response.json();
  return json;
}

async function queryToArrayBuffer(url) {
  let response = await query(url)
  let arrayBuffer = await response.arrayBuffer();
  let buffer = Buffer.from(arrayBuffer);
  return buffer;
}
