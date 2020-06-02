export class BitcoinQuery {

  constructor() {
    this.rootUrl = "https://blockstream.info/testnet/api/"
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

    txStatus.confirmed = statusResult.confirmed;

    let currentChainTipQuery = this.rootUrl.concat("blocks/tip/height");
    let currentChainTip = await queryToText(currentChainTipQuery);

    if (statusResult.hasOwnProperty('block_height')) {
      txStatus.confirmations = currentChainTip - statusResult.block_height;
    }

    return txStatus;
  }


  // Compatible with BTC core getrawtransaction
  // https://developer.bitcoin.org/reference/rpc/getrawtransaction.html
  // returns a hex encoded rawtx
  async getRawTransaction(txid) {
    let query = this.rootUrl.concat("tx/", txid.toString(), "/raw");
    let rawtx = await queryToArrayBuffer(query);
    return rawtx;
  }

  // Gets the Merkle proof including the position of the transaction
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
    return proof;
  }

  // Continually checks if a transaction is included in the blockchain
  // and returns the merkle proof if included
  async getMerkleProofFromIncludedTransaction(txid, confirmations) {
    let proof;
    // query every 60 seconds if the txid is included
    setInterval(async function(txid, confirmations) {
      let txStatus = await this.getStatusTransaction(txid);
      if (txStatus.confirmations === confirmations) {
        proof = await this.getMerkleProof(txid);
        clearInterval();
      }
    }, 30000);
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
