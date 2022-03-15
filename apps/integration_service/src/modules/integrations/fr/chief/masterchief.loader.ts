import { AbiItem } from 'web3-utils';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';
import { ChainDto } from '@app/common';
import { deepFind } from '../../data/templates/helpers';
import { FeatureCode } from '../../data/templates/chief/config';
import { buildCallsMap, buildCallsMapFromTemplate, findInAbi, findMatchInAbi, getTemplatedCall } from '../helpers';
import { LoaderAbstract } from '../loader.abstract';
import { DEFAULT_CONFIG as config } from './config';
import { ModuleRef } from '@nestjs/core';
import BigNumber from 'bignumber.js';
import { CallData } from '@app/common/dto/CallData';

export interface CallInfo {
  id?: string,
  target: string,
  abi: AbiItem,
  path: string,
  args?: any[]
}

enum TemplatedArgs {
  poolId = 'poolId',
  accountAddress = 'accountAddress',
}

export class MasterchiefLoader extends LoaderAbstract {
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
      throw new Error(`Not possible to make instance of class ${MasterchiefLoader.name}`)
    }
  }

  confirmChainConfiguration() {
    return Boolean(this.getPoolLengthCall())
      && Boolean(this.getRewardTokenCall())
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

  getPoolLengthCall(): CallInfo {
    const contractCallAbi = findMatchInAbi(config.poolLengthCalls, this.abi);
    return {
      id: this.address + ':' + contractCallAbi.name,
      target: this.address,
      abi: contractCallAbi,
      path: ''
    };
  }

  getStakingTokenCall(): CallInfo {
    const minAbi: Partial<AbiItem> = {
      name: "poolInfo",
      inputs: [
        {
          name: "",
          type: "uint256",
        }
      ],
      outputs: [
        {
          name: "lpToken",
          type: "address",
        }
      ]
    }
    const contractCallAbi = findInAbi(minAbi, this.abi);
    return {
      id: this.address + ':' + minAbi.name,
      target: this.address,
      abi: contractCallAbi,
      path: 'lpToken',
      args: [TemplatedArgs.poolId]
    };
  }

  getAccountBalanceCall(): CallInfo {
    const minAbi: Partial<AbiItem> = {
      name: "userInfo",
      inputs: [
        {
          name: "",
          type: "uint256"
        },
        {
          name: "",
          type: "address"
        }
      ],
      outputs: [
        {
          name: "amount",
          type: "uint256"
        },
        {
          name: "rewardDebt",
          type: "uint256"
        }
      ]
    }
    const contractCallAbi = findInAbi(minAbi, this.abi);
    return {
      id: this.address + ':' + minAbi.name,
      target: this.address,
      abi: contractCallAbi,
      path: 'amount',
      args: [TemplatedArgs.poolId, TemplatedArgs.accountAddress]
    };
  }

  getPendingRewardsCall(): CallInfo {
    const minAbi: Partial<AbiItem> = {
      name: "pendingCake",
      inputs: [
        {
          name: "_pid",
          type: "uint256"
        },
        {
          name: "_user",
          type: "address"
        }
      ],
      outputs: [
        {
          internalType: "uint256",
          name: "",
          type: "uint256"
        }
      ],
    }
    const contractCallAbi = findInAbi(minAbi, this.abi);
    return {
      id: this.address + ':' + minAbi.name,
      target: this.address,
      abi: contractCallAbi,
      path: '',
      args: [TemplatedArgs.poolId, TemplatedArgs.accountAddress]
    };
  }

  async loadVaults() {
    const poolLengthCall: CallInfo = this.getPoolLengthCall();
    const rewardTokenCall: CallInfo = this.getRewardTokenCall();
    const blockchainCalls = buildCallsMap([
      poolLengthCall,
      rewardTokenCall,
    ])

    const blockchainCallsResult = await this.multicall.handleInBatches(blockchainCalls, this.chain.id);

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

    const getStakingTokenTemplate = this.getStakingTokenCall()
    // if calldata we are checking if it ha
    const blockchainTemplatedCalls = buildCallsMapFromTemplate(getStakingTokenTemplate, templates);
    const blockchainTemplatedCallsResult = await this.multicall.handleInBatches(blockchainTemplatedCalls, this.chain.id);
    const extractedVaults = [];
    blockchainTemplatedCallsResult.forEach((callResult) => {
      const stakingToken = deepFind(callResult.output.data, getStakingTokenTemplate.path);
      const stakingTokenAddress = stakingToken.toLowerCase();
      extractedVaults.push({
        uniqueId: this.chain.abbr + ':' + poolLengthCall.target + ':' + `pid(${callResult.input.data[0]})`,
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

  // todo: receive deduplicated and filtered
  async loadAccountData(vaults: any[], addresses: string[]) {
    const getAccountBalanceTemplate = this.getAccountBalanceCall();
    const accountBalancesTemplates = [];
    for (let i = 0; i < vaults.length; i++) {
      for (let j = 0; j < addresses.length; j++) {
        accountBalancesTemplates.push({
          poolId: vaults[i].poolId,
          accountAddress: addresses[j].toLowerCase()
        })
      }
    }

    let blockchainTemplatedCalls = buildCallsMapFromTemplate(getAccountBalanceTemplate, accountBalancesTemplates);
    let blockchainTemplatedCallsResult = await this.multicall.handleInBatches(blockchainTemplatedCalls, this.chain.id);

    const getPendingRewardsTemplate = this.getPendingRewardsCall();
    const pendingRewardsBlockchainCalls = new Map<string, CallData>();

    const accountBalances = [];
    blockchainTemplatedCallsResult.forEach((callResult) => {
      const accountBalance: BigNumber = deepFind(callResult.output.data, getAccountBalanceTemplate.path);
      if (!accountBalance.isZero()) {
        const [poolId, accountAddress] = callResult.input.data;
        const vault = vaults.find((v) => v.poolId === poolId)
        accountBalances.push({
          ...vault,
          accountData: {
            address: accountAddress,
            balanceRaw: accountBalance.toString()
          }
        })
        // adding call to get pending rewards
        const [id, call] = getTemplatedCall(getPendingRewardsTemplate, {
          poolId: poolId,
          accountAddress: accountAddress
        })
        pendingRewardsBlockchainCalls.set(id, call)
      }
    });

    blockchainTemplatedCallsResult = await this.multicall.handleInBatches(pendingRewardsBlockchainCalls, this.chain.id);
    blockchainTemplatedCallsResult.forEach((callResult) => {
      const pendingReward: BigNumber = deepFind(callResult.output.data, getPendingRewardsTemplate.path);
      const [poolId, accountAddress] = callResult.input.data;
      const accBalance = accountBalances.find((ab) => ab.poolId === poolId && ab.accountData.address === accountAddress);
      accBalance.accountData.pendingRaw = pendingReward.toString();
    })

    return accountBalances;
  }

  async loadPeriodicalData() {
    // todo: check if cache data exists, if not load it
    // todo: get cached pool data

  }
}
