import {ContractTransaction, ContractReceipt} from '@ethersproject/contracts';

type Callback<T> = (tx: T) => void;

export class Notifier<T> {
  protected successCallbacks: Callback<T>[];
  protected errorCallbacks: Callback<Error>[];

  constructor(readonly promise: Promise<T>) {
    this.successCallbacks = [];
    this.errorCallbacks = [];
    this._handlePromise(promise);
  }

  private _handlePromise(promise: Promise<T>) {
    promise
      .then((res) => this.successCallbacks.forEach((f) => f(res)))
      .catch((err) => this.errorCallbacks.forEach((f) => f(err)));
  }

  on<Error>(event: 'error', callback: Callback<Error>): void;
  on<T>(event: string, callback: Callback<T>): void;
  on(event: string, callback: any): void {
    if (event === 'error') {
      this.errorCallbacks.push(callback);
    } else {
      this.successCallbacks.push(callback);
    }
  }
}

export class ConfirmationNotifier extends Notifier<
  ContractTransaction | ContractReceipt
> {
  on(event: 'error' | 'confirmation', callback: any): void {
    super.on(event, callback);
  }
}
