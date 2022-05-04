import type { AbiItem } from 'web3-utils';

import type { Address, ChainDto, ChainId, ChainIdEnum, FeatureEnum } from '@app/common';

import {
  ILendingFeatureEntryMinimal,
  ILendingFeatureOpportunity,
  ILendingFeatureUserEntry,
} from './interfaces/feature.lending.interface';
import {
  IPoolFeatureEntryMinimal,
  IPoolFeatureEntryOpportunity,
  IPoolFeatureEntryUserEntry,
  IPoolFeatureOpportunity,
} from './interfaces/feature.pool.interface';
import {
  IStakingFeatureOpportunity,
  IStakingFeatureUserEntry,
  IStakingFeatureMinimal,
} from './interfaces/feature.staking.interface';
import type { ERC20Token } from './interfaces/tokens.common.interface';

export interface IFeatureMeta {
  chain: ChainDto;
  list: FeatureEnum[];
}

// minimum viable metadata
export interface IPlatformMeta {
  // Human Readable Name
  name: string;

  // Platform Slug/Key
  // TODO: rename of Platform (or rename all Platforms as Projects)
  project: string;

  // All enabled features for this platform
  // (detected automatically based on registered protocols)
  features: IFeatureMeta[];

  // Social Media Links
  links?: {
    logo?: string; // main platform logo
    discord?: string; // project discord
    twitter?: string; // project twitter
    telegram?: string; // community telegram channel
    url?: string; // website url
    github?: string; // github profile
  };
}
export interface IProtocolMeta {
  chain: ChainIdEnum;
  feature: FeatureEnum;
}

export type IWalletMinimal =
  | IPoolFeatureOpportunity
  | IPoolFeatureEntryMinimal
  | IStakingFeatureMinimal
  | ILendingFeatureEntryMinimal;

export type IWalletOpportunity =
  | IPoolFeatureOpportunity
  | IPoolFeatureEntryOpportunity
  | IStakingFeatureOpportunity
  | ILendingFeatureOpportunity;

export type IWalletUserEntry =
  | IPoolFeatureEntryUserEntry
  | IStakingFeatureUserEntry
  | ILendingFeatureUserEntry;

export interface IChainUserEntry {
  // TODO: why doesn't partial work? it still requires all keys in RootPlatform@mergeUserProtocolDataPerChain
  // positions: { [key in Partial<FeatureEnum>]: IWalletUserEntry[] };
  positions: { [key: string]: IWalletUserEntry[] };
  features: FeatureEnum[];
  total: number;
  chain: ChainDto;
}
export interface IPlatformUserEntry {
  address: Address;
  total: number;
  chains: IChainUserEntry[];
}

// common required platform interface
export interface IRootPlatform {
  getMeta(): IPlatformMeta;
  getPoolData(chains: ChainId[]): Promise<[IWalletOpportunity[], Error[]]>; // return all pools
  getUsersData(chains: ChainId[], addresses: Address[]): Promise<[IPlatformUserEntry[], Error[]]>;
}

export interface IRootProtocol<TProtocolMeta extends IProtocolMeta = IProtocolMeta> {
  // Preparation steps (downloading the ABI)
  initialize(): Promise<void>;

  // returns the fully hydrated (with real-time prices) pool data
  getPoolData(): Promise<[IWalletOpportunity[], Error[]]>;
  // filters pool data to only include user positions
  getUsersData(addresses: Address[]): Promise<[Map<Address, IWalletUserEntry[]>, Error[]]>;

  // gets the cacheable pool data (without realtime such as prices)
  // getCacheableOpportunityData(): Promise<IWalletMinimal[]>;
  // // fills cached pool data with realtime prices etc
  // hydrateOpportunityData(pools: IWalletMinimal[]): Promise<IWalletOpportunity[]>;

  // caches all pool data
  cachePoolData(): Promise<IWalletMinimal[]>;

  // sets all required metadata for the instance
  meta: TProtocolMeta;
  registerMeta(meta: TProtocolMeta): void;
  // returns formatted metadata from the instance
  getMeta(): IFeatureMeta;
  // gets a unique ID per protocol
  getProtocolId(): string;
}
export interface IChainGroupedWallet {
  chain: ChainDto;
  features: FeatureEnum[];
  wallets: Map<string, IWalletUserEntry[]>;
}

type IFunctionPredicateContext = { readonly: AbiItem[]; full: AbiItem[]; [key: string]: any };
export type IFunctionPredicate = (context: IFunctionPredicateContext) => (item: AbiItem) => boolean;
export type INamedFunctionPredicates = { [key: string]: IFunctionPredicate };
export type INamedFunctions = { [key: string]: AbiItem };
export type TokenMap = Map<string, ERC20Token>;
export type UserEntryMap = Map<Address, IWalletUserEntry[]>;
