import { CallInput, MultiCall } from '@indexed-finance/multicall';
import { BigNumber } from 'bignumber.js';

import { MASTER_CHEF_PANCAKE_ABI } from './abis/MASTERCHEFPANCAKE';
import { MASTER_CHEF_TRADERJOE_ABI } from './abis/MASTERCHEFTRADERJOE';
import { UNIV2PAIR_ABI } from './abis/UNIV2PAIR';
import { MasterchiefPoolInfoResponse, MasterchiefPoolInfoTraderJoeResponse, TokenBalance, UniswapPairReserves } from './dto/token';

// legacy
export class MultiCallInternal extends MultiCall {
  constructor(protected readonly web3Instance) {
    super(web3Instance);
  }

  async getPoolsInfo(
    masterchiefAddress: string,
  ): Promise<Map<string, MasterchiefPoolInfoResponse>> {
    const [, poolLengthResult] = await this.multiCall(MASTER_CHEF_PANCAKE_ABI, [ 
      { target: masterchiefAddress, function: 'poolLength' },
    ]);
    const poolLength = poolLengthResult[0].toNumber();

    const poolsInfoMap: Map<string, MasterchiefPoolInfoResponse> = new Map<
      string,
      MasterchiefPoolInfoResponse
    >();
    // defined from testing
    const chunkSize = 45;
    for (let i = 0; i < poolLength; i += chunkSize) {
      const inputs: CallInput[] = [];
      for (let j = i; j < i + chunkSize && j < poolLength; j++) {
        inputs.push({ target: masterchiefAddress, function: 'poolInfo', args: [j] });
      }

      const [, poolInfos] = await this.multiCall(MASTER_CHEF_PANCAKE_ABI, inputs);

      for (let j = i, g = 0; j < i + chunkSize && j < poolLength; j++, g++) {
        poolsInfoMap.set(poolInfos[g].lpToken.toLowerCase(), {
          // covert to lower case once received!
          id: j,
          lpToken: poolInfos[g].lpToken.toLowerCase(),
          allocPoint: poolInfos[g].allocPoint,
          lastRewardBlock: poolInfos[g].lastRewardBlock,
          accCakePerShare: poolInfos[g].accCakePerShare,
        });
      }
    }
    return poolsInfoMap;
  }

  async getPoolsInfoTraderJoe(
    masterchiefAddress: string,
  ): Promise<Map<string, MasterchiefPoolInfoTraderJoeResponse>> {
    const [, poolLengthResult] = await this.multiCall(MASTER_CHEF_TRADERJOE_ABI, [
      { target: masterchiefAddress, function: 'poolLength' },
    ]);
    
    const poolLength = poolLengthResult[0].toNumber();

    const poolsInfoMap: Map<string, MasterchiefPoolInfoTraderJoeResponse> = new Map<
      string,
      MasterchiefPoolInfoTraderJoeResponse
    >();
    // defined from testing
    
    const chunkSize = 20;
    for (let i = 0; i < poolLength; i += chunkSize) {
      const inputs: CallInput[] = [];
      
      for (let j = i; j < i + chunkSize && j < poolLength; j++) {
        inputs.push({ target: masterchiefAddress, function: 'poolInfo', args: [j] });
      }
      
      const [, poolInfos] = await this.multiCall(MASTER_CHEF_TRADERJOE_ABI, inputs);

      for (let j = i, g = 0; j < i + chunkSize && j < poolLength; j++, g++) {
        poolsInfoMap.set(poolInfos[g].lpToken.toLowerCase(), {
          // covert to lower case once received!
          id: j,
          lpToken: poolInfos[g].lpToken.toLowerCase(),
          allocPoint: poolInfos[g].allocPoint,
          lastRewardTimestamp: poolInfos[g].lastRewardTimestamp,
          accJoePerShare: poolInfos[g].accJoePerShare,
        });
      }
    }
    
    return poolsInfoMap;
  }

  async getCake(masterchiefAddress: string): Promise<string> {
    const [, cakeResult] = await this.multiCall(MASTER_CHEF_PANCAKE_ABI, [
      { target: masterchiefAddress, function: 'cake' },
    ]);
    return cakeResult[0].toLowerCase();
  }

  async getPairsReserves(pairs: string[]): Promise<Map<string, UniswapPairReserves>> {
    const chunkSize = 100;
    const convertedReserves: Map<string, UniswapPairReserves> = new Map<
      string,
      UniswapPairReserves
    >();
    for (let i = 0, j = pairs.length; i < j; i += chunkSize) {
      const pairsSlice = pairs.slice(i, i + chunkSize);
      const [, multiCallReserves] = await super.getReserves(pairsSlice);
      for (const key in pairsSlice) {
        convertedReserves.set(pairsSlice[key], {
          reserve0: new BigNumber(multiCallReserves[pairsSlice[key]].reserve0.toString()),
          reserve1: new BigNumber(multiCallReserves[pairsSlice[key]].reserve1.toString()),
          blockTimestampLast: multiCallReserves[pairsSlice[key]].blockTimestampLast,
        });
      }
    }

    return convertedReserves;
  }

  async getTotalSupplies(pairs: string[]): Promise<Map<string, BigNumber>> {
    const chunkSize = 50;
    const convertedTotalSupplies: Map<string, BigNumber> = new Map<string, BigNumber>();
    for (let i = 0, j = pairs.length; i < j; i += chunkSize) {
      const pairsSlice = pairs.slice(i, i + chunkSize);
      const inputs: CallInput[] = [];
      pairsSlice.map((p) => inputs.push({ target: p, function: 'totalSupply' }));
      const [, multicallSupplies] = await this.multiCall(UNIV2PAIR_ABI, inputs);
      for (const key in pairsSlice) {
        convertedTotalSupplies.set(
          pairsSlice[key],
          new BigNumber(multicallSupplies[key].toString()),
        );
      }
    }

    return convertedTotalSupplies;
  }

  async getChiefBalances(
    balancesData: Map<number, TokenBalance>,
  ): Promise<Map<number, TokenBalance>> {
    const chunkSize = 50;
    const poolIds: number[] = Array.from(balancesData.keys());
    for (let i = 0, j = poolIds.length; i < j; i += chunkSize) {
      const poolIdsSlice = poolIds.slice(i, i + chunkSize);
      const inputs: CallInput[] = [];
      poolIdsSlice.map((pid) => {
        const existedData = balancesData.get(pid);
        inputs.push({
          target: existedData.tokenContract,
          function: 'balanceOf',
          args: [existedData.userAddress],
        });
      });

      const [, multicallBalances] = await this.multiCall(UNIV2PAIR_ABI, inputs);
      for (let z = 0; z < poolIdsSlice.length; z++) {
        balancesData.get(poolIdsSlice[z]).balance = new BigNumber(multicallBalances[z].toString());
      }
    }
    return balancesData;
  }
}
