import { Inject, Injectable } from '@nestjs/common';
import { CallInfo, MasterchiefBase } from './masterchief.base';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { ChainDto, Logger } from '@app/common';
import { deepFind } from '../../data/templates/helpers';
import { FeatureCode } from '../../data/templates/chief/config';
import { buildCallsMap, buildCallsMapFromTemplate } from '../helpers';

@Injectable()
export class MasterchiefLoader {

  constructor(private readonly multicall: MulticallAggregator,
              @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
  ) {}

  async loadVaults(masterchief: MasterchiefBase, chain: ChainDto) {
    const poolLengthCall: CallInfo = masterchief.getPoolLengthCall();
    const rewardTokenCall: CallInfo = masterchief.getRewardTokenCall();
    const blockchainCalls = buildCallsMap([
      poolLengthCall,
      rewardTokenCall,
    ])

    const blockchainCallsResult = await this.multicall.handleInBatches(blockchainCalls, chain.id);

    //const poolLength: BigNumber = deepFind(blockchainCallsResult.get(poolLengthCall.id).output.data, poolLengthCall.path);
    //cosnt poolLengthNumber = poolLength.toNumber();
    const poolLengthNumber = 2;

    const rewardToken = deepFind(blockchainCallsResult.get(rewardTokenCall.id).output.data, rewardTokenCall.path);
    const rewardTokenAddress = rewardToken.toLowerCase();

    const templates = [];
    for (let i = 0; i < poolLengthNumber; i++) {
      templates.push({
        poolId: i
      })
    }

    const getStakingTokenTemplate = masterchief.getStakingTokenCall()
    // if calldata we are checking if it ha
    const blockchainTemplatedCalls = buildCallsMapFromTemplate(getStakingTokenTemplate, templates);
    const blockchainTemplatedCallsResult = await this.multicall.handleInBatches(blockchainTemplatedCalls, chain.id);
    const extractedVaults = [];
    blockchainTemplatedCallsResult.forEach((callResult) => {
      const stakingToken = deepFind(callResult.output.data, getStakingTokenTemplate.path);
      const stakingTokenAddress = stakingToken.toLowerCase();
      extractedVaults.push({
        uniqueId: chain.abbr + ':' + poolLengthCall.target + ':' + `pid(${callResult.input.data[0]})`,
        poolId: callResult.input.data[0].toString(),
        poolAddress: poolLengthCall.target,
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
    })
    return extractedVaults;
  }

  async loadAccountData() {
    // todo: check if cache data exists, if not load it
    // todo: get cached pool data

  }

  async loadPeriodicalData() {
    // todo: check if cache data exists, if not load it
    // todo: get cached pool data

  }
}
