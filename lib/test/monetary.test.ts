import Big from 'big.js';
import { expect } from 'chai';
import * as fc from 'fast-check';

import * as monetary from '../monetary';

describe('currencies', () => {
  describe('BTC', () => {
    it('should have the correct amount of decimals', function () {
      expect(monetary.BTC.decimals).to.eq(8);
    });

    it('should have the correct name', () => {
      expect(monetary.BTC.name).to.eq('bitcoin');
    });
  });

  describe('ETH', () => {
    it('should have the correct amount of decimals', () => {
      expect(monetary.ETH.decimals).to.eq(18);
    });

    it('should have the correct name', () => {
      expect(monetary.ETH.name).to.eq('ethereum');
    });
  });

  describe('ERC20', () => {
    const dai = new monetary.ERC20('dai', 18);
    const comp = new monetary.ERC20('compound', 12);

    it('should have customizable decimals', function () {
      expect(dai.decimals).to.eq(18);
      expect(comp.decimals).to.eq(12);
    });

    it('should have customizable name', function () {
      expect(dai.name).to.eq('dai');
      expect(comp.name).to.eq('compound');
    });
  });
});

class DummyCurrency implements monetary.ICurrency {
  decimals = 10;
  name = 'dummy';
}
const DummyC = new DummyCurrency();


class DummyERC extends monetary.ERC20 {
}
const DummyERCT = new DummyERC('dummy', 5);


describe('MonetaryAmount', () => {
  describe('Base', () => {
    describe('constructor', () => {
      it('should use currency number of decimals by default', () => {
        const rawAmount = new Big(10);
        const amount = new monetary.MonetaryAmount<DummyCurrency>(DummyC, rawAmount);
        expect(amount.toBig().toString()).to.eq(rawAmount.toString());
      });

      it('should work with any number of decimals', () => {
        fc.assert(
          fc.property(fc.integer().filter(v => v >= 0 && v <= 50), decimals => {
            const rawAmount = new Big(5);
            const amount = new monetary.MonetaryAmount<DummyCurrency>(DummyC, rawAmount, decimals);
            expect(amount.toBig(decimals).toString()).to.eq(rawAmount.toString());
          })
        );
      });
    });

    describe('toString', () => {
      it('should format raw value by default', () => {
        fc.assert(
          fc.property(fc.integer().map(v => new Big(v)), rawAmount => {
            const amount = new monetary.MonetaryAmount<DummyCurrency>(DummyC, rawAmount);
            expect(amount.toString()).to.eq(rawAmount.toString());
          })
        );
      });

      it('should return largest unit in human readable format', () => {
        fc.assert(
          fc.property(fc.integer(), rawAmount => {
            const humanAmount = rawAmount / Math.pow(10, 10);
            const amount = new monetary.MonetaryAmount<DummyCurrency>(DummyC, rawAmount);
            expect(amount.toString(true)).to.eq(humanAmount.toLocaleString());
          })
        );
      });
    });
  });

  describe('BTCAmount', () => {
    const cases: [string, number][] = [['fromSatoshi', 100_000_000], ['fromMSatoshi', 100_000], ['fromBTC', 1]];
    cases.forEach(([name, decimalMul]) => {
      describe(name, () => {
        it('should be symmetric with toSatoshi', () => {
          fc.assert(
            fc.property(fc.integer().map(v => new Big(v)), rawAmount => {
              const amount = monetary.BTCAmount[name](rawAmount);
              const toName = name.replace('from', 'to'); // fromSatoshi -> toSatoshi
              expect(amount[toName]().toString()).to.eq(rawAmount.toString());
            })
          );
        });

        it('should be convertible to BTC', () => {
          fc.assert(
            fc.property(fc.integer().map(v => new Big(v)), rawAmount => {
              const amount = monetary.BTCAmount[name](rawAmount);
              expect(amount.toBTC().toString()).to.eq(
                rawAmount.div(decimalMul).toString());
            })
          );
        });
      });
    });
  });

  describe('ETHAmount', () => {
    const cases: [string, number][] = [['fromWei', Math.pow(10, 18)], ['fromGWei', Math.pow(10, 9)], ['fromEther', 1]];
    cases.forEach(([name, decimalMul]) => {
      describe(name, () => {
        it('should be symmetric with toWei', () => {
          fc.assert(
            fc.property(fc.integer().map(v => new Big(v)), rawAmount => {
              const amount = monetary.ETHAmount[name](rawAmount);
              const toName = name.replace('from', 'to'); // fromWei -> toWei
              expect(amount[toName]().toString()).to.eq(rawAmount.toString());
            })
          );
        });

        it('should be convertible to Ether', () => {
          fc.assert(
            fc.property(fc.integer().map(v => new Big(v)), rawAmount => {
              const amount = monetary.ETHAmount[name](rawAmount);
              expect(amount.toEther().toString()).to.eq(
                rawAmount.div(decimalMul).toString());
            })
          );
        });
      });
    });
  });

  describe('ERC20Amount', () => {
    describe('constructor', () => {
      it('should delegate to parent', () => {
        const rawAmount = new Big(10);
        const amount = new monetary.ERC20Amount(DummyERCT, rawAmount, 0);
        const expected = rawAmount.mul(new Big(10).pow(DummyERCT.decimals)).toString();
        expect(amount.toString()).to.eq(expected);
      });
    });
  });
});
