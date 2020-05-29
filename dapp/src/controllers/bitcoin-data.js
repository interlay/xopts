// export async blockstream api calls here

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


  // Comptabile with BTC core getrawtransaction
  // https://developer.bitcoin.org/reference/rpc/getrawtransaction.html
  // returns a hex encoded rawtx
  async getRawTransaction(txid) {
    let query = this.rootUrl.concat("tx/", txid.toString(), "/raw");

    let rawtx = await queryToText(query);
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


// status transaction
// if a tx is included



// proof
// needs to have index/pos
//
// raw tx
//
//
async function queryToText(url) {
  try {
    let response = await fetch(url);

    if (response.ok) {
      let text = await response.text();
      console.log(typeof(text));
      return text;
    } else {
      console.log(response.status);
    }
  } catch (error) {
    console.log("Query error");
    console.log(error);
  }
}

async function queryToJSON(url) {
  try {
    let response = await fetch(url);

    if (response.ok) {
      let json= response.json();
      return json;
    } else {
      console.log(response.status);
    }
  } catch (error) {
    console.log("Query error");
    console.log(error);
  }
}
