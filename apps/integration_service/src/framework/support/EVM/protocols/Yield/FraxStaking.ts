import BigNumber from 'bignumber.js';
import { Cache } from 'cache-manager';
import { plainToClass } from 'class-transformer';
import { isArray } from 'class-validator';
import { AbiItem } from 'web3-utils';

import { HttpService } from '@nestjs/axios';
import { CACHE_MANAGER, Inject } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import {
  Address,
  ChainAbbrEnum,
  ChainDto,
  ChainIdEnum,
  ChainNameEnum,
  FeatureEnum,
  Logger,
} from '@app/common';
import { BaseData } from '@app/common/dto/BaseData';
import { CallData } from '@app/common/dto/CallData';
import { normalizeDecimals } from '@app/common/utils';
import { DynamicContract } from '@app/common/web3provider/contracts/DynamicContract';
import { UniswapV2Pair } from '@app/common/web3provider/contracts/UniswapV2Pair';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { CurrentPricesPayload } from '../../../../../common/dto';
import { toDecimals } from '../../../../../common/utils/util';

import { AccountService } from '../../../../../modules/microservices/account.service';
import { PriceService } from '../../../../../modules/microservices/price.service';
import { Puppeteer } from '../../../../../modules/microservices/puppeteer';
import UniswapProtocolV3 from '../../../../../modules/protocols/protocols/uniswapProtocolV3';
import { IProtocolMeta } from '../../../interfaces';
import {
  IStakingFeatureMinimal,
  IStakingFeatureOpportunity,
  IStakingFeatureUserEntry,
} from '../../../interfaces/feature.staking.interface';
import { ERC20Token } from '../../../interfaces/tokens.common.interface';
import { AbiService } from '../../AbiModule/AbiService';
import { EVMCore } from '../../EVMCore';

interface IFraxStakingMeta extends IProtocolMeta {
  feature: FeatureEnum.staking;
  gaugeController: string;
  fxsStaking: string;
  fxsReward: string;
  fxsToken: string;
}

export class FraxStaking extends EVMCore<
  IStakingFeatureMinimal,
  IStakingFeatureOpportunity,
  IStakingFeatureUserEntry
> {
  meta: IFraxStakingMeta;

  private static setArrayItemToMap(key: string, value: any, map: Map<string, any>) {
    const mapItem = map.get(key);
    if (isArray(value)) {
      mapItem ? mapItem.push(...value) : map.set(key, value);
      return;
    }
    mapItem ? mapItem.push(value) : map.set(key, [value]);
    return;
  }

  constructor(
    protected httpService: HttpService,
    protected abiService: AbiService,
    protected multicall: MulticallAggregator,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected logger: Logger,
    @Inject(CACHE_MANAGER) protected cache: Cache,
    protected accountService: AccountService,
    protected priceService: PriceService,
    @Inject(Puppeteer) protected readonly browser: Puppeteer,
    protected uniswapV3: UniswapProtocolV3,
  ) {
    super();
  }

  async initialize() {
    return void 0;
  }

  private async getGitHubParseAddresses() {
    try {
      const page = await this.browser.loadPage(
        'https://github.com/FraxFinance/frax-solidity/blob/master/src/types/constants.ts',
      );
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const extractedText: string = await page.$eval('*', (el) => el.innerText);

      return ['export const CONTRACT_ADDRESSES', 'export const StakeChoices'].map((constName) => {
        const startIndex = extractedText.indexOf(constName);
        const contractAddressesRaw: string = extractedText.substring(startIndex);

        const objectStart = contractAddressesRaw.indexOf('{');
        let finishIndex;
        let numberOfScope = 1;
        const array = Array.from(contractAddressesRaw);
        array.forEach((char, index) => {
          if (index < objectStart + 1) return;
          if (char === '}') numberOfScope -= 1;
          if (char === '{') numberOfScope += 1;
          if (numberOfScope === 0) {
            finishIndex = index;
            array.length = index + 1;
          }
        });

        const fullyObject = contractAddressesRaw.substring(0, finishIndex + 1);

        const data = fullyObject.split(/[\n]/);
        const formattedString = data
          .map((line) => {
            if (line.startsWith('//') || line.indexOf('_link') !== -1 || line.startsWith('https'))
              return;
            const commentIndexOf = line.indexOf('//');
            if (commentIndexOf !== -1) {
              return line.substring(0, commentIndexOf);
            }
            return line;
          })
          .join('');

        const charArray = Array.from(formattedString);

        const result = this.formatObjectFromText(objectStart, charArray);
        return result.value;
      });
    } catch (e) {
      this.logger.error(e, 'getGitHubParseAddresses');
    }
  }

  getInputLessCallData(address: string, abi: AbiItem) {
    return plainToClass(CallData, {
      address,
      abi,
      input: {
        data: [],
      },
    });
  }

  private async getStakeRewardsAddresses(stakingAddresses: string[]) {
    const abis = await Promise.all(
      stakingAddresses.map((address) => this.abiService.fetchAbi(String(address), this.meta.chain)),
    );
    const callsMap = new Map();
    stakingAddresses.forEach((a, index) => {
      const currentAbi = abis[index];
      const getAllRewards = currentAbi.find((item) => item.name === 'getAllRewardTokens');
      const uniToken0 = currentAbi.find((item) => item.name === 'uni_token0');
      const uniToken1 = currentAbi.find((item) => item.name === 'uni_token1');
      if (getAllRewards) {
        callsMap.set(a, this.getInputLessCallData(`${a}`, getAllRewards));
        return;
      }
      if (uniToken0) {
        callsMap.set(`${a}.uni0`, this.getInputLessCallData(`${a}`, uniToken0));
        callsMap.set(`${a}.uni1`, this.getInputLessCallData(`${a}`, uniToken1));
      }
    });

    return await this.multicall.handleInBatches(callsMap, this.meta.chain);
  }

  async getCacheableOpportunityData(): Promise<IStakingFeatureMinimal[]> {
    const chainName = ChainNameEnum[ChainIdEnum[this.meta.chain]];
    const [fraxAddressesObj, fraxStakingsInfo] = await this.getGitHubParseAddresses();

    const pairAddresses = fraxAddressesObj[chainName].pair_tokens;
    const chainStakingTokens: { [key: string]: string } =
      fraxAddressesObj[chainName].staking_contracts;
    const stakingAddresses: string[] = Object.values(chainStakingTokens).filter(
      (address) => address,
    );

    const resp = await this.getStakeRewardsAddresses(stakingAddresses);

    const rewardsAddresses = fraxAddressesObj[chainName].reward_tokens;
    const bearerTokens = fraxAddressesObj[chainName].bearer_tokens;
    const mainAddresses = fraxAddressesObj[chainName].main;
    const collateralsAddresses = fraxAddressesObj[chainName].collaterals;

    const rewardTokensSymbols = Object.keys(rewardsAddresses);
    const stakingMinimalArray = Object.entries(chainStakingTokens).map(([key, value]) => {
      //TODO: temporary solution to avoid StakeDao tokens
      if (key.indexOf('StakeDAO') !== -1 || !value) return;
      const pairAddress = pairAddresses[key];
      const stakingInfo = fraxStakingsInfo[key];
      if (!stakingInfo) {
        this.logger.warn(`There is no staking information for ${key} pair`);
        return;
      }
      const rewardsTokensSymbols = JSON.parse(stakingInfo?.reward_tokens);
      const allStakingRewards = resp.get(String(value))?.output.data;
      const uni0 = resp.get(`${value}.uni0`)?.output.data.toLowerCase();
      const uni1 = resp.get(`${value}.uni1`)?.output.data.toLowerCase();
      if (allStakingRewards) {
        return this.toFeatureEntryMinimal(
          String(value),
          pairAddress,
          allStakingRewards.map((reward) => reward.toLowerCase()),
        );
      }

      if (uni0) {
        return this.toFeatureEntryMinimal(String(value), pairAddress, [
          uni0,
          uni1,
          this.meta.fxsToken,
        ]);
      }

      // several staking contracts tokens doesn't have methods to get reward tokens
      const poolRewards = rewardsTokensSymbols.map((symbol) => {
        const foundReward = rewardTokensSymbols.find(
          (reward) => reward.toLowerCase() === symbol.toLowerCase(),
        );
        const bearerToken = bearerTokens[symbol]?.toLowerCase();
        const mainAddress = mainAddresses[symbol]?.toLowerCase();
        const collateralAddress = collateralsAddresses[symbol]?.toLowerCase();
        return (
          rewardsAddresses[foundReward]?.toLowerCase() ||
          bearerToken ||
          mainAddress ||
          collateralAddress
        );
      });
      return this.toFeatureEntryMinimal(String(value), pairAddress, poolRewards);
    });

    stakingMinimalArray.push(
      this.toFeatureEntryMinimal(
        mainAddresses.veFXS.toLowerCase(),
        mainAddresses.FXS.toLowerCase(),
        [mainAddresses.FXS.toLowerCase()],
      ),
    );
    return stakingMinimalArray.filter((item) => item);
  }

  private toFeatureEntryMinimal(
    stakingAddr: string,
    lp: string,
    rewards: string[],
  ): IStakingFeatureMinimal {
    return {
      id: stakingAddr,
      chain: this.meta.chain,
      feature: this.meta.feature,
      rewarded:
        rewards?.map((reward) => ({ token: { address: reward }, rewardPerSecond: '0' })) ?? [],
      supplied: [
        {
          token: { address: lp },
          totalSupplied: '0',
        },
      ],
    };
  }

  protected async updateTokenData(
    tokens: any[],
    prices: CurrentPricesPayload,
  ): Promise<ERC20Token[]> {
    try {
      const calls = new Map();
      const abiTokensAddresses = tokens
        .filter((token) => token['isLp'])
        .map((token) => token.address);

      const tokensAbisMap = new Map();
      await Promise.all(
        abiTokensAddresses.map(async (address) => {
          tokensAbisMap.set(address, await this.abiService.fetchAbi(address, this.meta.chain));
        }),
      );

      tokens.forEach((item) => {
        if (item['underlyingAssets']?.length) {
          const abi = tokensAbisMap.get(item.address);
          const contract = new UniswapV2Pair(item.address);
          const priceAbi = abi.find((item) => item.name === 'pricePerShare');
          if (priceAbi)
            calls.set(
              `${item.address}.price`,
              this.getInputLessCallData(item.address, pricePerShare),
            );
          calls.set(`${item.address}.totalSupply`, contract.totalSupply());
          if (item['underlyingAssets']?.length === 2) {
            const getReserves = abi.find((item) => item.name === 'getReserves');
            getReserves
              ? calls.set(`${item.address}.getReserves`, contract.getReserves())
              : calls.set(`${item.address}.getReserves`, contract.getUnderlyingBalances());
            calls.set(`${item.address}.token0`, contract.token0());
            calls.set(`${item.address}.token1`, contract.token1());
            return;
          }
        }
      });

      const results = await this.multicall.handleInBatches(calls, this.meta.chain);
      tokens.forEach((token: any) => {
        if (token.isLp) {
          const price = toDecimals(
            results.get(`${token.address}.price`)?.output.data,
            token.decimals,
          );
          prices[token.address] = prices[token.address] ?? price;
          if (token.underlyingAssets?.length === 2) {
            const totalSupply = results.get(`${token.address}.totalSupply`).output.data;
            const token0Address = results.get(`${token.address}.token0`).output.data.toLowerCase();
            const token1Address = results.get(`${token.address}.token1`).output.data.toLowerCase();
            const reserves = results.get(`${token.address}.getReserves`).output.data;

            token.totalSupply = toDecimals(totalSupply, token.decimals);

            if (!Number(prices[token0Address]) && !Number(prices[token1Address])) return;

            // calculate/fill in missing base token prices based on current LP reserves
            if (!prices[token0Address]) {
              prices[token0Address] = reserves[1].times(prices[token1Address]).div(reserves[0]);
            }
            if (!prices[token1Address]) {
              prices[token1Address] = reserves[0].times(prices[token0Address]).div(reserves[1]);
            }

            // calculate/fill the LP token price into the price array
            const tvl0 = reserves[0].times(prices[token0Address]);
            const tvl1 = reserves[1].times(prices[token1Address]);
            prices[token.address] = new BigNumber(tvl0.plus(tvl1).toString()) //
              .div(totalSupply)
              .toNumber();
            token.underlyingAssets.forEach((u) => {
              u.reserve = normalizeDecimals(
                (u.reserve = u.positionInPool === 0 ? reserves[0] : reserves[1]).toString(),
                u.decimals,
              );
            });
          }
        }
      });
      return tokens;
    } catch (err) {
      this.logger.error(err.message, err.stack, 'FraxStaking');
      return tokens;
    }
  }

  async getPoolsInfoResp(pools: IStakingFeatureMinimal[]) {
    const calls = new Map();
    const abis = await Promise.all(
      pools.map((item) => this.abiService.fetchAbi(String(item.id), this.meta.chain)),
    );
    pools.forEach((item, index) => {
      const abi = abis[index];
      const contract = new DynamicContract(item.id);
      if (item.id.toLowerCase() === this.meta.fxsStaking.toLowerCase()) {
        // fxs totalStaked
        const totalFXSSupply = abi.find((item) => item.name === 'totalFXSSupply');
        calls.set(item.id, contract.createCall(totalFXSSupply));
        calls.set(
          `${item.id}-${this.meta.fxsToken}`,
          // method to get rewardPerSecond in FXS staking pool
          this.getInputLessCallData(this.meta.fxsReward, yieldRate),
        );
        return;
      }

      // methods to get rewardPerSecond
      const rewardRates = abi.find((item) => item.name === 'rewardRates');
      const rewardRate0 = abi.find((item) => item.name === 'rewardRate0');
      const rewardRate1 = abi.find((item) => item.name === 'rewardRate1');
      const rewardRate = abi.find((item) => item.name === 'rewardRate');

      const totalStaked = abi.find((item) => item.name === 'totalLiquidityLocked');
      const totalSupply = abi.find((item) => item.name === 'totalSupply');

      const totalAbiItem = totalStaked || totalSupply;
      calls.set(item.id, contract.createCall(totalAbiItem));

      item.rewarded.forEach((reward, indexV2) => {
        const callLabel = `${item.id}-${reward.token.address}`;
        if (rewardRates) {
          calls.set(callLabel, contract.createCall(rewardRates, indexV2));
          return;
        }

        if (reward.token.address === this.meta.fxsToken) {
          calls.set(callLabel, contract.createCall(rewardRate0 || rewardRate));
          return;
        }

        if (rewardRate1) {
          calls.set(callLabel, contract.createCall(rewardRate1));
        }
      });
    });
    return await this.multicall.handleInBatches(calls, this.meta.chain);
  }

  protected async updateRealTimeData(
    opportunities: IStakingFeatureMinimal[],
  ): Promise<IStakingFeatureMinimal[]> {
    const stakingPoolInfo = await this.getPoolsInfoResp(opportunities);
    return opportunities.map((pool) => {
      pool.supplied[0].totalSupplied = stakingPoolInfo.get(pool.id)?.output.data.toString();
      pool.rewarded.forEach((reward) => {
        reward.rewardPerSecond = stakingPoolInfo
          .get(`${pool.id}-${reward.token.address}`)
          ?.output.data.toString();
      });
      return pool;
    });
  }

  protected formatUserData(
    uniV3Resp: [BaseData[], string[]],
    usersPositions: Map<string, { liquidity; pool }[]>,
    addresses: Address[],
    multicallUserData: Map<string, CallData>,
    uniV3Raw: Map<string, { id; liquidity; pool: IStakingFeatureOpportunity }[]>,
  ): Map<string, IStakingFeatureUserEntry[]> {
    const resultMap = new Map();
    addresses.forEach((a) => {
      const userV3Data = uniV3Resp[0].find((item) => item.userAddress === a);
      const userPositions = usersPositions.get(a);

      const userPools = userPositions.map(({ liquidity, pool }) => {
        const liquidityDec = toDecimals(liquidity, pool.supplied[0].token.decimals);
        pool.supplied[0].amount = liquidityDec;
        if (pool.supplied[0].token.underlying?.length === 2) {
          const poolShare = liquidityDec / pool.supplied[0].token.totalSupply;
          let value = 0;
          pool.supplied[0].token.underlying.forEach((underlying) => {
            underlying.balance = poolShare * underlying.reserve;
            underlying.value = underlying.balance * underlying.price;
            value += underlying.value;
          });
          pool.supplied[0].value = value || null;
        } else {
          pool.supplied[0].value = liquidityDec * pool.supplied[0].token.price;
        }

        const earned = multicallUserData.get(`${a}.${pool.id}.earned`).output.data;
        pool.rewarded.forEach((reward, index) => {
          const { token } = reward;
          const amount = toDecimals(earned[index] || earned, token.decimals);
          const value = amount * token.price;
          Object.assign(reward, { amount, value });
        });
        return pool as IStakingFeatureUserEntry;
      });
      userPools.push(...this.formatV3UserData(uniV3Raw.get(a), multicallUserData, userV3Data));
      resultMap.set(a, userPools);
    });
    return resultMap;
  }

  formatObjectFromText(index: number, array: string[]): any {
    let field;
    let value;
    const testObj = {};
    for (let i = index + 1; i < array.length; ) {
      if ([' ', '"', "'"].includes(array[i])) {
        i++;
        continue;
      }
      if (array[i] === '}') {
        if (field) {
          testObj[field] = value;
        }
        return { value: testObj, length: i + 1 };
      }
      if (array[i] === '{') {
        const fieldObj = this.formatObjectFromText(i, array);
        Object.assign(testObj, fieldObj);
      }
      if (array[i] === ':') {
        const result = this.getField(i, array);
        value = result.value;
        i = result.length;
        continue;
      }
      if (array[i] === ',') {
        testObj[field] = value;
        const returnData = this.getField(i, array);
        i = returnData?.length;
        field = returnData?.value;
        continue;
      }
      const returnData = this.getField(i - 1, array);
      field = returnData.value;
      i = returnData.length;
    }
  }

  getField(index: number, array: string[]): { length: number; value: string } {
    const strArray = [];
    if (index + 1 >= array.length) return { length: index + 1, value: null };
    for (let i = index + 1; i < array.length; i++) {
      if (array[i] === '[' && !strArray.length) return this.getArrayObject(i, array);
      if (array[i].match(/\s/) && strArray.length && array[i + 1].match(/\w/)) {
        strArray.push(array[i]);
        continue;
      }
      if (array[i].match(/['"\s]/)) continue;
      if (array[i] === '{') {
        return this.formatObjectFromText(i, array);
      }
      if (array[i].match(/[,:;}]/)) return { value: strArray.join(''), length: i };
      strArray.push(array[i]);
    }
  }

  getArrayObject(index: number, array: string[]) {
    const strArray = [];
    for (let i = index; i < array.length; i++) {
      strArray.push(array[i]);
      if (array[i] === ']') return { value: strArray.join(''), length: i + 1 };
    }
  }

  async fetchMulticallUserData(pools: IStakingFeatureOpportunity[], addresses: Address[]) {
    const calls = new Map();
    const poolsAbis = await Promise.all(
      pools.map((pool) => this.abiService.fetchAbi(pool.id, this.meta.chain)),
    );
    addresses.forEach((a) => {
      pools.forEach((pool, index) => {
        const poolAbi = poolsAbis[index];
        const lockedMethod = poolAbi.find((item) => item.name === 'locked');
        const earned = poolAbi.find((item) => item.name === 'earned');
        calls.set(
          `${a}.${pool.id}.earned`,
          plainToClass(CallData, {
            //Getting rewards for FXS staking token needs the call to separate contract
            address: lockedMethod ? this.meta.fxsReward : pool.id,
            abi: earned ? earned : earnedAbi,
            input: {
              data: [a],
            },
          }),
        );

        const lockedNfts = poolAbi.find((item) => item.name === 'lockedNFTsOf');
        if (lockedNfts) {
          calls.set(
            `${a}.${pool.id}.userBalance`,
            plainToClass(CallData, {
              address: pool.id,
              abi: lockedNfts,
              input: {
                data: [a],
              },
            }),
          );
          return;
        }
        // methods of obtaining staking user balance
        const lockedLiquidityOf = poolAbi.find((item) => item.name === 'lockedLiquidityOf');
        const lockedBalanceOf = poolAbi.find((item) => item.name === 'lockedBalanceOf');
        // fxs staking balance check with the 'locked' method
        const callAbi = !lockedMethod
          ? lockedLiquidityOf
            ? lockedLiquidityOf
            : lockedBalanceOf
          : lockedMethod;
        calls.set(
          `${a}.${pool.id}.userBalance`,
          plainToClass(CallData, {
            address: pool.id,
            abi: callAbi,
            input: {
              data: [a],
            },
          }),
        );
      });
    });
    return await this.multicall.handleInBatches(calls, this.meta.chain);
  }

  async getUsersData(
    addresses: Address[],
  ): Promise<[Map<Address, IStakingFeatureUserEntry[]>, Error[]]> {
    const [pools, errors] = await this.getPoolData();
    let formattedData = new Map();
    try {
      const multicallUserData = await this.fetchMulticallUserData(pools, addresses);
      const v3UsersPositionsMap = new Map();
      const userPositionsMap = new Map<string, { liquidity; pool }[]>();
      addresses.forEach((a) => {
        pools.forEach((poolItem) => {
          const userPoolBalance = multicallUserData.get(`${a}.${poolItem.id}.userBalance`)?.output
            .data;
          if (isArray(userPoolBalance)) {
            const positions = userPoolBalance
              .map((position) => {
                if (Number(position.liquidity)) {
                  return {
                    id: position.token_id,
                    liquidity: position.liquidity,
                    pool: JSON.parse(JSON.stringify(poolItem)),
                  };
                }
              })
              .filter((position) => position);
            FraxStaking.setArrayItemToMap(a, positions, v3UsersPositionsMap);
          } else {
            if (Number(userPoolBalance) || Number(userPoolBalance?.amount)) {
              const mapItem = {
                liquidity: userPoolBalance?.amount?.toString() ?? userPoolBalance.toString(),
                pool: JSON.parse(JSON.stringify(poolItem)),
              };
              FraxStaking.setArrayItemToMap(a, mapItem, userPositionsMap);
            }
          }
        });
      });

      // I use this logic to avoid duplicating a lot of code
      const uniV3PositionsResp = await this.uniswapV3.getUserPositions(
        addresses,
        plainToClass(ChainDto, {
          id: this.meta.chain,
          name: ChainNameEnum[this.meta.chain],
          abbr: ChainAbbrEnum[this.meta.chain],
        }),
        Array.from(v3UsersPositionsMap.keys()).reduce((resp, key) => {
          resp.set(
            key,
            v3UsersPositionsMap.get(key).map((item) => item.id),
          );
          return resp;
        }, new Map()),
      );

      formattedData = this.formatUserData(
        uniV3PositionsResp,
        userPositionsMap,
        addresses,
        multicallUserData,
        v3UsersPositionsMap,
      );
    } catch (e) {
      errors.push(e);
    }
    return [formattedData, errors];
  }

  formatV3UserData(
    rawUniV3: { id; liquidity; pool: IStakingFeatureOpportunity }[],
    multicallResp: Map<string, CallData>,
    data: BaseData,
  ) {
    return rawUniV3?.map(({ liquidity, pool }, index) => {
      const respItem = data[`items`][index];
      pool.supplied[0].token.address = respItem[`lpToken`].address;
      pool.supplied[0]['amount'] = liquidity;
      pool.supplied[0].token.name = `Uniswap V3 ${respItem.tokens
        .map((token) => token.symbol)
        .join('/')}`;
      pool.supplied[0]['value'] = 0;
      pool.supplied[0].token.underlying = respItem.tokens?.map((token) => {
        const underlying = {
          address: token.address,
          name: token.name,
          decimals: token.decimals,
          symbol: token.symbol,
          price: token.price,
          reserve: token.reserve,
          balance: token.balance,
          value: token.value,
          position: token.positionInPool,
          weight: token.weight,
        };
        pool.supplied[0]['value'] += underlying.value;
        return underlying;
      });

      pool.rewarded.forEach((reward) => {
        if (reward.token.address === this.meta.fxsToken) {
          const amount = toDecimals(
            multicallResp.get(`${data.userAddress}.${pool.id}.earned`).output.data,
            reward.token.decimals,
          );
          const value = amount * reward.token.price;
          Object.assign(reward, { amount, value });
        } else {
          const v3Reward = respItem.rewards.find((r) => r.address === reward.token.address);
          Object.assign(reward, {
            amount: v3Reward.claimableData.balance,
            value: v3Reward.claimableData.value,
          });
        }
      });
      return pool as IStakingFeatureUserEntry;
    });
  }

  protected formatOpportunity(
    pool: IStakingFeatureMinimal,
    tokens: Map<Address, any>,
  ): void | IStakingFeatureOpportunity {
    const stakedToken = tokens.get(pool.supplied[0].token.address.toLowerCase());
    if (!stakedToken) return;
    const totalSuppliedDec = toDecimals(pool.supplied[0].totalSupplied, stakedToken.decimals || 18);
    const tvl = totalSuppliedDec * stakedToken.price;

    const opportunityRewards = pool.rewarded.map((reward) => {
      const token = tokens.get(reward.token.address);
      const rewardOpportunity = {
        token,
        harvests: null,
        apr: null,
        apy: null, // assuming once per day
      };
      if (reward.rewardPerSecond) {
        const rewardPerSecondDec = toDecimals(reward.rewardPerSecond, token.decimals);
        const pricePerSecond = rewardPerSecondDec * token.price;
        const { apr: harvests } = this.getYieldBreakdown(rewardPerSecondDec, 1);
        const { apr, apy } = this.getYieldBreakdown(pricePerSecond, tvl);
        rewardOpportunity.harvests = harvests;
        rewardOpportunity.apr = apr;
        rewardOpportunity.apy = apy;
      }
      return rewardOpportunity;
    });

    return {
      feature: pool.feature,
      id: pool.id,
      chain: pool.chain,
      supplied: [
        {
          token: stakedToken,
          totalSupplied: totalSuppliedDec,
          tvl,
        },
      ],
      rewarded: opportunityRewards,
    };
  }
}

// TODO: these abis for the case when we can't obtain contract's abi via abiService(for proxy contracts)
export const earnedAbi: AbiItem = {
  inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
  name: 'earned',
  outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
  stateMutability: 'view',
  type: 'function',
};

export const yieldRate: AbiItem = {
  inputs: [],
  name: 'yieldRate',
  outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
  stateMutability: 'view',
  type: 'function',
};

export const pricePerShare: AbiItem = {
  inputs: [],
  name: 'pricePerShare',
  outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
  stateMutability: 'view',
  type: 'function',
};
