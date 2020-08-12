import Big, { BigSource } from 'big.js';
import { expect } from 'chai';
import * as fc from 'fast-check';

import * as monetary from '../../lib/monetary';

const fcBig = () => fc.integer().map(v => new Big(v))

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

class DummyAmount extends monetary.MonetaryAmount<DummyCurrency> {
  constructor(amount: BigSource, decimals?: number) { super(DummyC, amount, decimals); }
  withAmount(amount: BigSource): this {
      const Cls = this.constructor as new (amount: BigSource) => this;
      return new Cls(amount);
  }
}

describe('MonetaryAmount', () => {
  describe('Base', () => {
    describe('constructor', () => {
      it('should use currency number of decimals by default', () => {
        const rawAmount = new Big(10);
        const amount = new DummyAmount(rawAmount);
        expect(amount.toBig().toString()).to.eq(rawAmount.toString());
      });

      it('should work with any number of decimals', () => {
        fc.assert(
          fc.property(fc.integer().filter(v => v >= 0 && v <= 50), decimals => {
            const rawAmount = new Big(5);
            const amount = new DummyAmount(rawAmount, decimals);
            expect(amount.toBig(decimals).toString()).to.eq(rawAmount.toString());
          })
        );
      });
    });

    describe('toString', () => {
      it('should format raw value by default', () => {
        fc.assert(
          fc.property(fcBig(), rawAmount => {
            const amount = new DummyAmount(rawAmount);
            expect(amount.toString()).to.eq(rawAmount.toString());
          })
        );
      });

      it('should return largest unit in human readable format', () => {
        fc.assert(
          fc.property(fc.integer(), rawAmount => {
            const humanAmount = rawAmount / Math.pow(10, 10);
            const amount = new DummyAmount(rawAmount);
            expect(amount.toString(true)).to.eq(humanAmount.toLocaleString());
          })
        );
      });
    });

    describe('arithmetic', () => {
      describe('add', () => {
        it('should add and create new value', () => {
          fc.assert(
            fc.property(fcBig(), fcBig(), (rawAmountA, rawAmountB) => {
              const amountA = new DummyAmount(rawAmountA);
              const amountB = new DummyAmount(rawAmountB);
              const added = amountA.add(amountB);
              expect(added.toBig().toString()).to.eq(rawAmountA.add(rawAmountB).toString());
              expect(amountA.toString()).to.eq(rawAmountA.toString());
              expect(amountB.toString()).to.eq(rawAmountB.toString());
            })
          );
        });
      });

      describe('sub', () => {
        it('should subtract and create new value', () => {
          fc.assert(
            fc.property(fcBig(), fcBig(), (rawAmountA, rawAmountB) => {
              const amountA = new DummyAmount(rawAmountA);
              const amountB = new DummyAmount(rawAmountB);
              const added = amountA.sub(amountB);
              expect(added.toBig().toString()).to.eq(rawAmountA.sub(rawAmountB).toString());
              expect(amountA.toString()).to.eq(rawAmountA.toString());
              expect(amountB.toString()).to.eq(rawAmountB.toString());
            })
          );
        });
      });

      describe('mul', () => {
        it('should multiply and create new value', () => {
          fc.assert(
            fc.property(fcBig(), fc.integer(), (rawAmount, multiplier) => {
              const amount = new DummyAmount(rawAmount);
              const multiplied = amount.mul(multiplier);
              expect(multiplied.toBig().toString()).to.eq(rawAmount.mul(multiplier).toString());
              expect(amount.toString()).to.eq(rawAmount.toString());
            })
          );
        });
      });

      describe('div', () => {
        it('should divide and create new value', () => {
          fc.assert(
            fc.property(fcBig(), fc.integer().filter(v => v !== 0), (rawAmount, divisor) => {
              const amount = new DummyAmount(rawAmount);
              const divided = amount.div(divisor);
              expect(divided.toBig().toString()).to.eq(rawAmount.div(divisor).toString());
              expect(amount.toString()).to.eq(rawAmount.toString());
            })
          );
        });

        it('should fail when dividing by zero', () => {
          expect(() => new DummyAmount(1).div(0)).to.throw('Division by zero');
        });
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

    describe('arithmetic', () => {
      ['add', 'sub'].forEach(op => {
        describe(op, () => {
          it(`should ${op} tokens`, () => {
            const dai = new monetary.ERC20('dai');
            const amountA = new monetary.ERC20Amount(dai, 30);
            const amountB = new monetary.ERC20Amount(dai, 10);
            const added = amountA[op](amountB);
            const expected = op === 'add' ? '40' : '20';
            expect(added.toBig().toString()).to.eq(expected);
          });

          it('should fail with different currencies', () => {
            const amountA = new monetary.ERC20Amount(new monetary.ERC20('dai'), 30);
            const amountB = new monetary.ERC20Amount(new monetary.ERC20('comp'), 10);
            expect(() => amountA[op](amountB)).to.throw(`cannot ${op}`);
          });
        });
      });
    })
  });
});
