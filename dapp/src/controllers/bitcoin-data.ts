import { BitcoinInterface } from "../types/Bitcoin";

export const STABLE_CONFIRMATIONS = 1;

export class BitcoinQuery implements BitcoinInterface {
  rootUrl: string;

  constructor() {
    this.rootUrl = "https://blockstream.info/testnet/api/"
  }

  async getBlockHeight(): Promise<number> {
    let currentChainTipQuery = this.rootUrl.concat("blocks/tip/height");
    return parseInt(await queryToText(currentChainTipQuery));
  }

  // Returns a status object with
  // status = {
  //   confirmed: bool,
  //   confirmations: number
  // }
  async getStatusTransaction(txid: string): Promise<{
    confirmed: boolean
    confirmations: number
  }> {

    let txStatus = {
      confirmed: false,
      confirmations: 0,
    }

    let statusQuery = this.rootUrl.concat("tx/", txid.toString(), "/status");
    let statusResult = await queryToJSON(statusQuery);

    txStatus.confirmed = statusResult.confirmed;

    let currentChainTip = await this.getBlockHeight();

    if (statusResult.hasOwnProperty('block_height')) {
      txStatus.confirmations = currentChainTip - statusResult.block_height;
    }

    return txStatus;
  }

  // Compatible with BTC core getrawtransaction
  // https://developer.bitcoin.org/reference/rpc/getrawtransaction.html
  // returns a hex encoded rawtx
  async getRawTransaction(txid: string) {
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
  async getMerkleProof(txid: string): Promise<{
    block_height: number,
    merkle: string[]
    pos: number
  }> {
    let query = this.rootUrl.concat("tx/", txid.toString(), "/merkle-proof");
    let proof = await queryToJSON(query);
    return proof;
  }
}

async function query(url: string): Promise<Response> {
  try {
    let response = await fetch(url);

    if (response.ok) {
      return response;
    } else {
      // TODO: retry?
      throw Error("No response");
    }
  } catch (error) {
    throw error;
  }
}

async function queryToText(url: string) {
  let response = await query(url);
  let text = await response.text();
  return text;
}

async function queryToJSON(url: string) {
  let response = await query(url);
  let json = await response.json();
  return json;
}

async function queryToArrayBuffer(url: string) {
  let response = await query(url);
  let arrayBuffer = await response.arrayBuffer();
  let buffer = Buffer.from(arrayBuffer);
  return buffer;
}
