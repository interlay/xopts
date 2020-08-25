import * as bitcoin from 'bitcoinjs-lib';

interface TxApi {
  getTxHex(txId: string): Promise<string>;
}

interface Tx {
  txid: string;
}

interface AddrApi {
  getTxHistory(addr: string): Promise<Array<Tx>>;
}

async function getRequestsFromTx(
  txId: string,
  data: string,
  txApi: TxApi
): Promise<string[]> {
  const hex = await txApi.getTxHex(txId);
  const btx = bitcoin.Transaction.fromHex(hex);
  return btx.outs
    .map((txOut) => bitcoin.script.decompile(txOut.script))
    .filter((chunks): chunks is Array<number | Buffer> => {
      return !chunks ? false : chunks.length >= 2;
    })
    .filter((chunks) => {
      // we're only interested in those with op_return data
      return chunks[0] == bitcoin.opcodes.OP_RETURN;
    })
    .filter((chunks) => {
      return (chunks[1] as Buffer).toString('hex') === data;
    })
    .map(() => {
      return txId;
    });
}

async function getRequestsFromHistory(
  addr: string,
  data: string,
  addrApi: AddrApi,
  txApi: TxApi
): Promise<string[][]> {
  const txs = await addrApi.getTxHistory(addr);
  return Promise.all(txs.map((tx) => getRequestsFromTx(tx.txid, data, txApi)));
}

export async function getRequest(
  addr: string,
  data: string,
  addrApi: AddrApi,
  txApi: TxApi
): Promise<string | undefined> {
  const txIds = ([] as string[]).concat(
    ...(await getRequestsFromHistory(addr, data, addrApi, txApi))
  );
  return txIds.length >= 1 ? txIds[0] : undefined;
}
