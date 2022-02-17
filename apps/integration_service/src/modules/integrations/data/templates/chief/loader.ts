import { Inject, Injectable } from '@nestjs/common';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';
import { AbiItem } from 'web3-utils';
import { CallData } from '@app/common/dto/CallData';
import { plainToClass } from 'class-transformer';
import { collectCalls, deepFind } from '../helpers';
import BigNumber from 'bignumber.js';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { Logger } from '@app/common';
import { CallGroup, ContractVars, FeatureCode, PoolData } from './config';

@Injectable()
export class ChiefLoader {

  requiredForInitialLoad = [
    ContractVars.poolLength,
    ContractVars.stakingToken,
    ContractVars.rewardToken,
  ];

  protected requiredForVault = [
    ContractVars.poolAllocationPoints,
    ContractVars.totalAllocationPoints,
  ];

  protected requiredForAccount = [
    ContractVars.userBalance,
  ];

  constructor(private readonly multicall: MulticallAggregator,
              @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
  ) {}

  async collectFeatures(address, chain, fieldsMapping: Map<string, {call: CallGroup, abi: AbiItem}>): Promise<any> {
    const blockchainCalls = new Map<string, CallData>();
    blockchainCalls.set(ContractVars.rewardToken, plainToClass(CallData, {
      address: address,
      abi: fieldsMapping.get(ContractVars.rewardToken).abi
    }))
    blockchainCalls.set(ContractVars.poolLength, plainToClass(CallData, {
      address: address,
      abi: fieldsMapping.get(ContractVars.poolLength).abi,
    }))

    const blockchainCallsResult = await this.multicall.handleInBatches(blockchainCalls, chain.id);
    const rewardTokenAddress = deepFind(
      blockchainCallsResult.get(ContractVars.rewardToken),
      fieldsMapping.get(ContractVars.rewardToken).call.path
    );
    const poolLength: BigNumber = deepFind(
      blockchainCallsResult.get(ContractVars.poolLength),
      fieldsMapping.get(ContractVars.poolLength).call.path
    );

    const stakingTokenCalls = new Map<string, CallData>();
    for (let i = 0; i < poolLength.toNumber(); i++) {
      stakingTokenCalls.set(ContractVars.stakingToken + ':' + i, plainToClass(CallData, {
        address: address,
        abi: fieldsMapping.get(ContractVars.stakingToken).abi,
        input: {
          data: [i]
        }
      }))
    }
    const extractedPools: PoolData[] = [];
    const stakingTokenCallsResult = await this.multicall.handleInBatches(stakingTokenCalls, chain.id);
    for (let i = 0; i < poolLength.toNumber(); i++) {
      const stakingTokenAddress = deepFind(
        stakingTokenCallsResult.get(ContractVars.stakingToken + ':' + i),
        fieldsMapping.get(ContractVars.stakingToken).call.path
      );
      extractedPools.push({
        uniqueId: chain.abbr + ':' + address + ':' + `pid(${i})`,
        poolId: i.toString(),
        poolAddress: address,
        featureCode: FeatureCode.chiefVault,
        stakingToken: {
          address: stakingTokenAddress.toLowerCase(),
        },
        rewards: [
          {
            address: rewardTokenAddress.toLowerCase()
          }
        ]
      })
    }
    return extractedPools;
  }

  collectCallsPerVault(poolData: PoolData, abiItems: AbiItem[]) {
    const blockchainCalls = collectCalls(this.requiredForVault, abiItems);
    return blockchainCalls;
  }

  collectCallsPerAccount(poolData: PoolData, abiItems: AbiItem[]) {
    const blockchainCalls = collectCalls(this.requiredForAccount, abiItems);
    console.log('collectCallsPerAccount')
    console.log(blockchainCalls)
    return blockchainCalls;
  }

  async updateFeaturesData(address, abi, chain): Promise<any> {
    // console.log('requirements');
    // console.log(this.requirements[0]);

    // we found matched list of calls:
    // const poolLength = ChiefLoadingDefinitions[0].find((call) => call.property === Functions.poolLength);
    // const poolLengthCall = plainToClass(CallData, {
    //   address: address,
    //   abi: poolLength.abi,
    // })

    // const poolLengthCallResult = await this.multicall.handleInBatches(new Map<string, CallData>([['poolLength', poolLengthCall]]), chain.id);

    // console.log(poolLengthCallResult);
  }

  loadAccountData(addresses) {
    // this.strategy.loadData()
    // console.log('requirements');
  }
}
