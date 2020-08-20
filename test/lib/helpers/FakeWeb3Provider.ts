/* eslint-disable @typescript-eslint/no-explicit-any */

import assert from 'assert';
import {utils} from 'ethers';

const WORD_SIZE: number = 32;

type RPCRequest = {method: string; params?: Array<any>};

interface RegisteredResponse {
  shouldExecute: (method: string, params?: Array<any>) => boolean;
  result: object;
  isError: boolean;
}

export default class ExternalProvider {
  private responses: Array<RegisteredResponse> = [];

  constructor(
    public isMetaMask?: boolean,
    public host?: string,
    public path?: string
  ) {}

  register(
    method: string,
    result: any,
    options: {
      shouldExec?: (params?: Array<any>) => boolean;
      isError?: boolean;
      n?: number;
      to?: string;
    }
  ): void {
    if (typeof result === 'string' && result.startsWith('0x')) {
      assert(result.length % 2 == 0, 'response length must be even');
    }

    const filters: Array<(params?: Array<any>) => boolean> = [];
    if (options.shouldExec) {
      filters.push(options.shouldExec);
    }
    if (options.to) {
      filters.push((params?: Array<any>) => {
        return (
          params &&
          params.length > 0 &&
          params[0].to &&
          params[0].to.toLowerCase() === options.to?.toLowerCase()
        );
      });
    }

    const shouldExecute = (givenMethod: string, params?: Array<any>) => {
      return method === givenMethod && filters.every((f) => f(params));
    };
    const response = {
      shouldExecute,
      result,
      isError: options.isError ?? false
    };
    for (let i = 0; i < (options.n ?? 1); i++) {
      this.responses.push(response);
    }
  }

  sendAsync(
    request: RPCRequest,
    callback: (error: any, response: any) => void
  ): void {
    this.send(request, callback);
  }

  send(
    request: RPCRequest,
    callback: (error: any, response: any) => void
  ): void {
    try {
      callback(null, this.getResponse(request));
    } catch (err) {
      callback(err, null);
    }
  }

  async request(request: {method: string; params?: Array<any>}): Promise<any> {
    let response = this.getResponse(request);
    if (request.method !== 'eth_call') {
      return response;
    }

    // NOTE: it seems that the reply must be padded so that the total size
    // is a multiple of the word size (32)
    // https://github.com/ethers-io/ethers.js/blob/d817416bae2fbc7adb8391fd038613241b7ab8ba/packages/abi/src.ts/interface.ts#L311
    if (typeof response === 'string' && response.startsWith('0x')) {
      const length = (response.length - 2) / 2;
      response = utils.hexZeroPad(
        response,
        Math.ceil(length / WORD_SIZE) * WORD_SIZE
      );
    }
    return response;
  }

  private getResponse({
    method,
    params
  }: {
    method: string;
    params?: Array<any>;
  }): any {
    const index = this.responses.findIndex((response) =>
      response.shouldExecute(method, params)
    );
    if (index === -1) {
      throw new Error(`${method} not registered`);
    }
    return this.responses.splice(index, 1)[0].result;
  }
}
