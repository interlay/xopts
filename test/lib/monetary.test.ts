import Big, {BigSource} from 'big.js';
import {expect} from 'chai';
import * as fc from 'fast-check';

import * as monetary from '../../lib/monetary';

const fcBig = (): fc.Arbitrary<Big> => fc.integer().map((v) => new Big(v));

const newBig = (value: number, decimals: number = 0) => new Big(value).mul(new Big(10).pow(decimals));

describe('currencies', () => {
  describe('BTC', () => {
    it('should have the correct amount of decimals', () => {
      expect(monetary.BTC.decimals).to.eq(8);
    });

    it('should have the correct name', () => {
      expect(monetary.BTC.name).to.eq('Bitcoin');
    });
  });

  describe('ETH', () => {
    it('should have the correct amount of decimals', () => {
      expect(monetary.ETH.decimals).to.eq(18);
    });

    it('should have the correct name', () => {
      expect(monetary.ETH.name).to.eq('Ethereum');
    });
  });

  describe('ERC20', () => {
    const dai = new monetary.ERC20('Dai', '0x', 18);
    const comp = new monetary.ERC20('Compound', '0x', 12);

    it('should have customizable decimals', () => {
      expect(dai.decimals).to.eq(18);
      expect(comp.decimals).to.eq(12);
    });

    it('should have customizable name', () => {
      expect(dai.name).to.eq('Dai');
      expect(comp.name).to.eq('Compound');
    });
  });
});

class DummyCurrency implements monetary.Currency {
  decimals = 10;
  name = 'Dummy';
}
const DummyC = new DummyCurrency();

class DummyERC extends monetary.ERC20 {
  constructor(name: string, decimals: number = 18) {
    super(name, '0x', decimals);
  }
}
const DummyERCT = new DummyERC('Dummy', 5);

class DummyAmount extends monetary.MonetaryAmount<DummyCurrency> {
  constructor(amount: BigSource, decimals?: number) {
    super(DummyC, amount, decimals);
  }
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
          fc.property(
            fc.integer().filter((v) => v >= 0 && v <= 50),
            (decimals) => {
              const rawAmount = new Big(5);
              const amount = new DummyAmount(rawAmount, decimals);
              expect(amount.toBig(decimals).toString()).to.eq(rawAmount.toString());
            }
          )
        );
      });
    });

    describe('toString', () => {
      it('should format raw value by default', () => {
        fc.assert(
          fc.property(fcBig(), (rawAmount) => {
            const amount = new DummyAmount(rawAmount);
            expect(amount.toString()).to.eq(rawAmount.toString());
          })
        );
      });

      it('should return largest unit in human readable format', () => {
        fc.assert(
          fc.property(fc.integer(), (rawAmount) => {
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
            fc.property(
              fcBig(),
              fc.integer().filter((v) => v !== 0),
              (rawAmount, divisor) => {
                const amount = new DummyAmount(rawAmount);
                const divided = amount.div(divisor);
                expect(divided.toBig().toString()).to.eq(rawAmount.div(divisor).toString());
                expect(amount.toString()).to.eq(rawAmount.toString());
              }
            )
          );
        });

        it('should fail when dividing by zero', () => {
          expect(() => new DummyAmount(1).div(0)).to.throw('Division by zero');
        });
      });
    });
  });

  type toBTCAmount = 'toSatoshi' | 'toMSatoshi' | 'toBTC';

  describe('BTCAmount', () => {
    const cases: [(amount: BigSource) => monetary.BTCAmount, toBTCAmount, number][] = [
      [monetary.BTCAmount.fromSatoshi, 'toSatoshi', 100_000_000],
      [monetary.BTCAmount.fromMSatoshi, 'toMSatoshi', 100_000],
      [monetary.BTCAmount.fromBTC, 'toBTC', 1]
    ];
    cases.forEach(([from, toName, decimalMul]) => {
      describe(from.name, () => {
        it('should be symmetric with toSatoshi', () => {
          fc.assert(
            fc.property(
              fc.integer().map((v) => new Big(v)),
              (rawAmount) => {
                const amount = from(rawAmount);
                // fromSatoshi -> toSatoshi
                expect(amount[toName]().toString()).to.eq(rawAmount.toString());
              }
            )
          );
        });

        it('should be convertible to BTC', () => {
          fc.assert(
            fc.property(
              fc.integer().map((v) => new Big(v)),
              (rawAmount) => {
                const amount = from(rawAmount);
                expect(amount.toBTC().toString()).to.eq(rawAmount.div(decimalMul).toString());
              }
            )
          );
        });
      });
    });
  });

  type toETHAmount = 'toWei' | 'toGWei' | 'toEther';

  describe('ETHAmount', () => {
    const cases: [(amount: BigSource) => monetary.ETHAmount, toETHAmount, number][] = [
      [monetary.ETHAmount.fromWei, 'toWei', Math.pow(10, 18)],
      [monetary.ETHAmount.fromGWei, 'toGWei', Math.pow(10, 9)],
      [monetary.ETHAmount.fromEther, 'toEther', 1]
    ];
    cases.forEach(([from, toName, decimalMul]) => {
      describe(from.name, () => {
        it('should be symmetric with toWei', () => {
          fc.assert(
            fc.property(
              fc.integer().map((v) => new Big(v)),
              (rawAmount) => {
                const amount = from(rawAmount);
                // fromWei -> toWei
                expect(amount[toName]().toString()).to.eq(rawAmount.toString());
              }
            )
          );
        });

        it('should be convertible to Ether', () => {
          fc.assert(
            fc.property(
              fc.integer().map((v) => new Big(v)),
              (rawAmount) => {
                const amount = from(rawAmount);
                expect(amount.toEther().toString()).to.eq(rawAmount.div(decimalMul).toString());
              }
            )
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

    type amountOp = 'add' | 'sub';

    describe('arithmetic', () => {
      (['add', 'sub'] as Array<amountOp>).forEach((op) => {
        describe(op, () => {
          it(`should ${op} tokens`, () => {
            const dai = new monetary.ERC20('Dai', '0x');
            const amountA = new monetary.ERC20Amount(dai, 30);
            const amountB = new monetary.ERC20Amount(dai, 10);
            const added = amountA[op](amountB);
            const expected = op === 'add' ? '40' : '20';
            expect(added.toBig().toString()).to.eq(expected);
          });

          it('should fail with different currencies', () => {
            const amountA = new monetary.ERC20Amount(new monetary.ERC20('Dai', '0x'), 30);
            const amountB = new monetary.ERC20Amount(new monetary.ERC20('Compound', '0x'), 10);
            expect(() => amountA[op](amountB)).to.throw(`cannot ${op}`);
          });
        });
      });
    });
  });

  describe('MonetaryAmount', () => {
    const rawRate = 9200;
    const USDT = new monetary.Tether('0x');
    const normalizedRawRate = newBig(rawRate, USDT.decimals);
    const rate = new monetary.ExchangeRate(monetary.BTC, USDT, normalizedRawRate);

    describe('toBase', () => {
      it('should correctly convert value', () => {
        const btcAmount = rate.toBase(new monetary.MonetaryAmount(USDT, rawRate * 3, 0));
        expect(btcAmount.toBig(0).eq(new Big(3))).to.be.true;
      });
    });

    describe('toCounter', () => {
      it('should correctly convert value', () => {
        const usdtAmount = rate.toCounter(new monetary.BTCAmount(2, 0));
        expect(usdtAmount.toBig(0).eq(new Big(rawRate * 2))).to.be.true;
      });
    });
  });
});
