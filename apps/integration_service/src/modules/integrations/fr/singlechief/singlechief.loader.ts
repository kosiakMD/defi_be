import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';
import { ChainDto } from '@app/common';
import { deepFind } from '../../data/templates/helpers';
import { FeatureCode } from '../../data/templates/chief/config';
import { buildCallsMap, findMatchInAbi } from '../helpers';
import { CallInfo } from '../chief/masterchief.loader';
import { AbiItem } from 'web3-utils';
import { ModuleRef } from '@nestjs/core';
import { DEFAULT_CONFIG as config } from './config';
import { LoaderAbstract } from '../loader.abstract';

export class SingleChiefLoader extends LoaderAbstract {

  private readonly address;
  private readonly abi: AbiItem[];
  private chain: ChainDto;
  private metadata;
  private multicall: MulticallAggregator;

  constructor(
    private moduleRef: ModuleRef,
    private configuration: {
      address,
      abi,
      chain,
      metadata
    }
  ) {
    super();
    this.multicall = moduleRef.get(MulticallAggregator);
    this.address = configuration.address;
    this.abi = configuration.abi;
    this.chain = configuration.chain;
    this.metadata = configuration.metadata;
    if (!this.confirmChainConfiguration()) {
      throw new Error(`Not possible to make instance of class ${SingleChiefLoader.name}`)
    }
  }

  confirmChainConfiguration() {
    return Boolean(this.getRewardTokenCall())
      && Boolean(this.getStakingTokenCall());
  }

  getRewardTokenCall(): CallInfo  {
    const contractCallAbi = findMatchInAbi(config.rewardTokenCalls, this.abi);
    return {
      id: this.address + ':' + contractCallAbi.name,
      target: this.address,
      abi: contractCallAbi,
      path: ''
    };
  }

  getStakingTokenCall(): CallInfo {
    const contractCallAbi = findMatchInAbi(config.stakingTokenCalls, this.abi);
    return {
      id: this.address + ':' + contractCallAbi.name,
      target: this.address,
      abi: contractCallAbi,
      path: '',
    };
  }

  async loadVaults() {
    const stakingTokenCall: CallInfo = this.getStakingTokenCall();
    const rewardTokenCall: CallInfo = this.getRewardTokenCall();
    const blockchainCalls = buildCallsMap([
      stakingTokenCall,
      rewardTokenCall,
    ])

    // todo:
    // this logic must be replaced and moved to the external class which can collect calls,
    // make requests,
    //notify this class
    const blockchainCallsResult = await this.multicall.handleInBatches(blockchainCalls, this.chain.id);

    const stakingToken = deepFind(blockchainCallsResult.get(stakingTokenCall.id).output.data, stakingTokenCall.path);
    const stakingTokenAddress = stakingToken.toLowerCase();

    const rewardToken = deepFind(blockchainCallsResult.get(rewardTokenCall.id).output.data, rewardTokenCall.path);
    const rewardTokenAddress = rewardToken.toLowerCase();

    const extractedVaults = [];
    extractedVaults.push({
      uniqueId: this.chain.abbr + ':' + stakingTokenCall.target,
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
