import assert from 'assert';

interface RPCResponse {
  jsonrpc: string;
  id: number;
  result?: object;
}

interface RPCError {
  jsonrpc: string;
  id: number;
  error: object;
}

interface Dictionary<T> {
  [key: string]: Array<T>;
}

export default class ExternalProvider {
  private requestId: number = 0;

  responses: Dictionary<RPCResponse | RPCError> = {};

  constructor(
    public isMetaMask?: boolean,
    public host?: string,
    public path?: string
  ) {}

  register(method: string, response: RPCResponse | RPCError) {
    this.responses[method].push(response);
  }

  sendAsync(
    request: {
      method: string;
      params?: Array<any>;
    },
    callback: (error: any, response: any) => void
  ) {
    this.requestId++;
    const response = this.getResponse(request.method);
    this.isError(response)
      ? callback(response, null)
      : callback(null, response);
  }

  send(
    request: {
      method: string;
      params?: Array<any>;
    },
    callback: (error: any, response: any) => void
  ) {
    this.requestId++;
    const response = this.getResponse(request.method);
    this.isError(response)
      ? callback(response, null)
      : callback(null, response);
  }

  async request(request: {method: string; params?: Array<any>}): Promise<any> {
    this.requestId++;
    const response = this.getResponse(request.method);
    if (this.isError(response)) {
      throw new Error(JSON.stringify(response));
    }
    return response;
  }

  private getResponse(method: string): RPCResponse | RPCError {
    const responses = this.responses[method];

    const response = responses.shift();
    if (response !== undefined) {
      return response;
    }

    return {
      jsonrpc: '2.0',
      id: this.requestId,
      error: {
        code: 404,
        message: `${method} not registered`
      }
    };
  }

  private isError(response: RPCResponse | RPCError): response is RPCError {
    return (response as RPCError).error !== undefined;
  }
}
