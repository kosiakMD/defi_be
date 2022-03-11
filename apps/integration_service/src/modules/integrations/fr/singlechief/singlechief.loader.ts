import { Inject, Injectable } from '@nestjs/common';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { ChainDto, Logger } from '@app/common';
import { deepFind } from '../../data/templates/helpers';
import { FeatureCode } from '../../data/templates/chief/config';
import { buildCallsMap } from '../helpers';
import { SingleChiefBase } from './singlechief.base';
import { CallInfo } from '../chief/masterchief.base';

@Injectable()
export class SingleChiefLoader {

  constructor(private readonly multicall: MulticallAggregator,
              @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
  ) {}

  async loadVaults(masterchief: SingleChiefBase, chain: ChainDto) {
    const stakingTokenCall: CallInfo = masterchief.getStakingTokenCall();
    const rewardTokenCall: CallInfo = masterchief.getRewardTokenCall();
    const blockchainCalls = buildCallsMap([
      stakingTokenCall,
      rewardTokenCall,
    ])

    // todo:
    // this logic must be replaced and moved to the external class which can collect calls,
    // make requests,
    //notify this class
    const blockchainCallsResult = await this.multicall.handleInBatches(blockchainCalls, chain.id);

    const stakingToken = deepFind(blockchainCallsResult.get(stakingTokenCall.id).output.data, stakingTokenCall.path);
    const stakingTokenAddress = stakingToken.toLowerCase();

    const rewardToken = deepFind(blockchainCallsResult.get(rewardTokenCall.id).output.data, rewardTokenCall.path);
    const rewardTokenAddress = rewardToken.toLowerCase();

    const extractedVaults = [];
    extractedVaults.push({
      uniqueId: chain.abbr + ':' + stakingTokenCall.target,
      poolAddress: stakingTokenCall.target,
      featureCode: FeatureCode.singleChief,
      stakingToken: {
        address: stakingTokenAddress.toLowerCase(),
      },
      rewards: [
        {
          address: rewardTokenAddress.toLowerCase()
        }
      ]
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
