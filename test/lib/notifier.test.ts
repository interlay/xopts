import {Notifier} from '../../lib/notifier';
import {expect} from 'chai';

export class SampleNotifier extends Notifier<string> {
  on(event: 'error' | 'success', callback: any): void {
    super.on(event, callback);
  }
}

describe('Notifier', () => {
  describe('on', () => {
    it('should handle success', async () => {
      const promise = Promise.resolve('abc');
      const notifier = new SampleNotifier(promise);
      let result = '';
      notifier.on('success', (res: string) => {
        result = res;
      });
      await promise;
      expect(result).to.eq('abc');
    });

    it('should handle failure', async () => {
      const promise = Promise.reject(new Error('abc'));
      const notifier = new SampleNotifier(promise);
      let result = '';
      let error = null;
      notifier.on('success', (res: string) => {
        console.log('great success');
        result = res;
      });
      notifier.on('error', (err: Error) => {
        error = err;
      });
      await promise.catch(() => {});
      expect(result).to.eq('');
      expect(error).to.not.be.null;
    });
  });
});
