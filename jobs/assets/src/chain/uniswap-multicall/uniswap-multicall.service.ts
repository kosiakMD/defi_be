import { aggregate } from '@makerdao/multicall';
import BigNumber from 'bignumber.js';
import Web3 from 'web3';

export class UniswapMulticallService {
  constructor(private readonly web3: Web3, private readonly multicallAddress: string) {}

  async getTokenDecimals(tokens: string[]): Promise<{ [token: string]: number }> {
    const calls = tokens.map((token) => ({
      target: token,
      call: ['decimals()(uint256)'],
      returns: [[token, (decimals: BigNumber) => decimals.toNumber()]],
    }));

    const {
      results: { transformed },
    } = await aggregate(calls, {
      web3: this.web3,
      multicallAddress: this.multicallAddress,
    });

    return transformed;
  }

  async allPairsLength(factoryAddress: string): Promise<number> {
    const {
      results: { transformed },
    } = await aggregate(
      {
        target: factoryAddress,
        call: ['allPairsLength()(uint256)'],
        returns: [['allPairsLength', (val: BigNumber) => val.toNumber()]],
      },
      {
        web3: this.web3,
        multicallAddress: this.multicallAddress,
      },
    );

    return transformed.allPairsLength;
  }

  async getPairs(factoryAddress: string, pairs: number[]): Promise<string[]> {
    const calls = pairs.map((pair) => ({
      target: factoryAddress,
      call: ['allPairs(uint256)(address)', pair],
      returns: [[pair]],
    }));

    const {
      results: { transformed },
    } = await aggregate(calls, {
      web3: this.web3,
      multicallAddress: this.multicallAddress,
    });

    return Object.values(transformed);
  }

  async getTokensForPairs(pairs: string[]): Promise<PairTokens[]> {
    const calls = pairs
      .map((pair) => [
        {
          target: pair,
          call: ['token0()(address)'],
          returns: [[`${pair}_token0`]],
        },
        {
          target: pair,
          call: ['token1()(address)'],
          returns: [[`${pair}_token1`]],
        },
      ])
      .flat();

    const {
      results: { transformed },
    } = await aggregate(calls, {
      web3: this.web3,
      multicallAddress: this.multicallAddress,
    });

    return pairs.map((pair) => ({
      address: pair,
      token0: transformed[`${pair}_token0`],
      token1: transformed[`${pair}_token1`],
    }));
  }

  async getPairReserves(
    pairs: string[],
  ): Promise<{ [pair: string]: { reserve0: BigNumber; reserve1: BigNumber } }> {
    const calls = pairs.map((pair) => ({
      target: pair,
      call: ['getReserves()(uint112,uint112,uint32)'],
      returns: [[`${pair}_reserve0`], [`${pair}_reserve1`], [`${pair}_block`]],
    }));

    const {
      results: { transformed },
    } = await aggregate(calls, {
      web3: this.web3,
      multicallAddress: this.multicallAddress,
    });

    return pairs.reduce(
      (rsp, pair) => ({
        ...rsp,
        [pair]: {
          reserve0: transformed[`${pair}_reserve0`],
          reserve1: transformed[`${pair}_reserve1`],
        },
      }),
      {},
    );
  }
}

export type PairTokens = {
  address: string;
  token0: string;
  token1: string;
};
