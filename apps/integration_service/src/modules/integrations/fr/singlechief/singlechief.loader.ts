import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';
import { ChainDto } from '@app/common';
import { deepFind } from '../../data/templates/helpers';
import { buildCallsMap, findInAbi, findMatchInAbi, getCallId, getTemplatedCall } from '../helpers';
import { CallInfo } from '../chief/masterchief.loader';
import { AbiItem } from 'web3-utils';
import { ModuleRef } from '@nestjs/core';
import { DEFAULT_CONFIG as config } from './config';
import { LoaderAbstract } from '../loader.abstract';
import { CallData } from '@app/common/dto/CallData';
import { Cache } from 'cache-manager';
import BigNumber from 'bignumber.js';
import { CACHE_MANAGER } from '@nestjs/common';

enum TemplatedArgs {
  accountAddress = 'accountAddress',
}

export class SingleChiefLoader extends LoaderAbstract {

  private readonly implementationId;
  private readonly address;
  private readonly abi: AbiItem[];
  private chain: ChainDto;
  private metadata;
  private readonly multicall: MulticallAggregator;
  private cache: Cache;

  constructor(
    private moduleRef: ModuleRef,
    private configuration: {
      confirmChainConfiguration,
      address,
      abi,
      chain,
      metadata
    }
  ) {
    super();
    this.cache = this.moduleRef.get(CACHE_MANAGER, {strict: false});
    this.multicall = moduleRef.get(MulticallAggregator);
    this.address = configuration.address;
    this.abi = configuration.abi;
    this.chain = configuration.chain;
    this.metadata = configuration.metadata;
    this.implementationId = this.chain.abbr + ':' + this.metadata.protocol + ':' + SingleChiefLoader.name;
    if (configuration.confirmChainConfiguration && !this.confirmChainConfiguration()) {
      throw new Error(`Not possible to make instance of class ${SingleChiefLoader.name}`)
    }
  }

  getImplementationId() {
    return this.implementationId;
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

  getAccountBalanceCall(): CallInfo {
    const minAbi: Partial<AbiItem> = {
      name: "userInfo",
      inputs: [
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
      args: [TemplatedArgs.accountAddress]
    };
  }

  getPendingRewardsCall(): CallInfo {
    const minAbi: Partial<AbiItem> = {
      name: "pendingReward",
      inputs: [
        {
          name: "_user",
          type: "address"
        }
      ],

      outputs: [
        {
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
      args: [TemplatedArgs.accountAddress]
    };
  }

  async loadVaults() {
    const stakingTokenCall: CallInfo = this.getStakingTokenCall();
    const rewardTokenCall: CallInfo = this.getRewardTokenCall();
    const blockchainCalls = buildCallsMap([
      stakingTokenCall,
      rewardTokenCall,
    ])

    const blockchainCallsResult = await this.multicall.handleInBatches(blockchainCalls, this.chain.id);

    const stakingToken = deepFind(blockchainCallsResult.get(stakingTokenCall.id).output.data, stakingTokenCall.path);
    const stakingTokenAddress = stakingToken.toLowerCase();

    const rewardToken = deepFind(blockchainCallsResult.get(rewardTokenCall.id).output.data, rewardTokenCall.path);
    const rewardTokenAddress = rewardToken.toLowerCase();

    const extractedVaults = [];
    extractedVaults.push({
      uniqueId: this.chain.abbr + ':' + stakingTokenCall.target,
      poolAddress: stakingTokenCall.target,
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
        const [vault, accountAddress] = [vaults[i], addresses[j].toLowerCase()];
        const [id, call] = getTemplatedCall(vault.metadata.getAccountBalanceCall, {
          accountAddress: accountAddress
        });
        const [rId, rCall] = getTemplatedCall(vault.metadata.getPendingRewardsCall, {
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
        const [vault, accountAddress] = [vaults[i], addresses[j].toLowerCase()];
        const accountBalanceCallId = getCallId(vault.metadata.getAccountBalanceCall, [accountAddress]);
        const accountPendingBalanceCallId = getCallId(vault.metadata.getPendingRewardsCall, [accountAddress]);

        const balance: BigNumber = deepFind(blockchainTemplatedCallsResult.get(accountBalanceCallId).output.data, vault.metadata.getAccountBalanceCall.path);
        const rewardBalance: BigNumber = deepFind(blockchainTemplatedCallsResult.get(accountPendingBalanceCallId).output.data, vault.metadata.getPendingRewardsCall.path);

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

    return accountBalances;
  }

  async loadPeriodicalData() {
    const vaults: any = await this.cache.get(this.implementationId);
    if (!vaults) {
      throw new Error(`Not found cached vaults for key ${this.implementationId}`)
    }
    return vaults;
  }
}
