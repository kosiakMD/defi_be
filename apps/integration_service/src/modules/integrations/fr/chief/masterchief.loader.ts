import { AbiItem } from 'web3-utils';
import { ChainDto } from '@app/common';
import { deepFind } from '../../data/templates/helpers';
import {
  buildCallsMap,
  buildCallsMapFromTemplate,
  findInAbi,
  findMatchInAbi,
  getCallId,
  getTemplatedCall
} from '../helpers';
import { LoaderAbstract } from '../loader.abstract';
import { DEFAULT_CONFIG as config } from './config';
import { ModuleRef } from '@nestjs/core';
import BigNumber from 'bignumber.js';
import { CallData } from '@app/common/dto/CallData';
import { MulticallProxy } from '../multicall.proxy';
import { CACHE_MANAGER } from '@nestjs/common';
import { Cache } from 'cache-manager';

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
  private readonly implementationId;
  private readonly abi: AbiItem[];
  private chain: ChainDto;
  private metadata;
  private multicall: MulticallProxy;
  private cache: Cache;

  constructor(
    private moduleRef: ModuleRef,
    private configuration: {
      address,
      abi,
      chain,
      metadata,
      confirmChainConfiguration,
    }
  ) {
    super();
    this.multicall = moduleRef.get(MulticallProxy);
    this.cache = this.moduleRef.get(CACHE_MANAGER, {strict: false});
    this.address = configuration.address;
    this.abi = configuration.abi;
    this.chain = configuration.chain;
    this.metadata = configuration.metadata;
    if (configuration.confirmChainConfiguration && !this.confirmChainConfiguration()) {
      throw new Error(`Not possible to make instance of class ${MasterchiefLoader.name}`)
    }
    this.implementationId = this.chain.abbr + ':' + this.metadata.protocol + ':' + MasterchiefLoader.name + ':' + this.address;
  }

  getImplementationId() {
    return this.implementationId;
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
    console.log('load vaults')
    const poolLengthCall: CallInfo = this.getPoolLengthCall();
    const rewardTokenCall: CallInfo = this.getRewardTokenCall();
    const blockchainCalls = buildCallsMap([
      poolLengthCall,
      rewardTokenCall,
    ])

    const blockchainCallsResult = await this.multicall.handleInBatches(blockchainCalls, this.chain.id);

    const poolLength: BigNumber = deepFind(blockchainCallsResult.get(poolLengthCall.id).output.data, poolLengthCall.path);
    let poolLengthNumber = poolLength.toNumber();
    // console.log(poolLengthNumber)
    poolLengthNumber = 2;

    const rewardToken = deepFind(blockchainCallsResult.get(rewardTokenCall.id).output.data, rewardTokenCall.path);
    const rewardTokenAddress = rewardToken.toLowerCase();

    const templates = [];
    for (let i = 0; i < poolLengthNumber; i++) {
      templates.push({
        poolId: i
      })
    }

    const getStakingTokenTemplate = this.getStakingTokenCall()
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
        stakingToken: {
          address: stakingTokenAddress.toLowerCase(),
        },
        rewards: [
          {
            address: rewardTokenAddress.toLowerCase()
          }
        ],
        metadata: {
          getAccountBalanceCall: this.getAccountBalanceCall(),
          getPendingRewardsCall: this.getPendingRewardsCall(),
        }
      })
    })
    return extractedVaults;
  }


  async loadAccountData(addresses: string[]) {
    const vaults: any = await this.cache.get(this.implementationId);
    if (!vaults) {
      throw new Error(`Not found cached vaults for key ${this.implementationId}`)
    }

    const blockchainTemplatedCalls = new Map<string, CallData>();
    for (let i = 0; i < vaults.length; i++) {
      for (let j = 0; j < addresses.length; j++) {
        const [vault, accountAddress] = [vaults[i], addresses[j].toLowerCase()]
        const [id, call] = getTemplatedCall(vault.metadata.getAccountBalanceCall, {
          poolId: vault.poolId,
          accountAddress: accountAddress
        });
        const [rId, rCall] = getTemplatedCall(vault.metadata.getPendingRewardsCall, {
          poolId: vault.poolId,
          accountAddress: accountAddress
        });
        blockchainTemplatedCalls.set(id, call)
        blockchainTemplatedCalls.set(rId, rCall)
      }
    }

    let blockchainTemplatedCallsResult = await this.multicall.handleInBatches(blockchainTemplatedCalls, this.chain.id);

    const accountBalances = [];
    for (let i = 0; i < vaults.length; i++) {
      for (let j = 0; j < addresses.length; j++) {
        const [poolId, accountAddress] = [vaults[i].poolId, addresses[j].toLowerCase()];
        const vault = vaults.find((v) => v.poolId === poolId);

        const accountBalanceCallId = getCallId(vault.metadata.getAccountBalanceCall, [poolId, accountAddress]);
        const accountRewardsCallId = getCallId(vault.metadata.getPendingRewardsCall, [poolId, accountAddress]);

        const balance: BigNumber = deepFind(blockchainTemplatedCallsResult.get(accountBalanceCallId).output.data, vault.metadata.getAccountBalanceCall.path);
        const rewardBalance: BigNumber = deepFind(blockchainTemplatedCallsResult.get(accountRewardsCallId).output.data, vault.metadata.getPendingRewardsCall.path);

        if (!balance.isZero()) {
          accountBalances.push({
            ...vault,
            accountData: {
              address: accountAddress,
              balanceRaw: balance.toString(),
              pendingRaw: rewardBalance.toString(),
            }
          });
        }
      }
    }

    return accountBalances;
  }

  async loadPeriodicalData() {
    // todo: check if cache data exists, if not load it
    // todo: get cached pool data



  }
}
