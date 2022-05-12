import type { AbiItem } from 'web3-utils';

import type { Address, ChainDto, ChainId, ChainIdEnum, FeatureEnum } from '@app/common';
import { IPlatformLinks } from '@app/common/interfaces/platform.v3.links';

import {
  IClaimableFeatureOpportunity,
  IClaimableFeatureUser,
} from './interfaces/feature.claimable.interface';
import {
  ILendingFeatureEntryMinimal,
  ILendingFeatureOpportunity,
  ILendingFeatureUserEntry,
} from './interfaces/feature.lending.interface';
import {
  IPoolFeatureEntryMinimal,
  IPoolFeatureEntryOpportunity,
  IPoolFeatureEntryUserEntry,
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
  links?: IPlatformLinks;
}
export interface IProtocolMeta {
  id?: string; // todo: should be required
  name: string;
  chain: ChainIdEnum;
  feature: FeatureEnum;
  links?: any; // TODO: match IFeaturedLinks, but this is callable functions to generate the urls
}

export type IWalletMinimal =
  | IPoolFeatureEntryMinimal
  | IStakingFeatureMinimal
  | ILendingFeatureEntryMinimal;

export type IWalletOpportunity =
  | IPoolFeatureEntryOpportunity
  | IStakingFeatureOpportunity
  | ILendingFeatureOpportunity
  | IClaimableFeatureOpportunity;

export type IWalletUserEntry =
  | IPoolFeatureEntryUserEntry
  | IStakingFeatureUserEntry
  | ILendingFeatureUserEntry
  | IClaimableFeatureUser;

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
  cachePoolData;
  getPoolData?(chains: ChainId[]): Promise<[IWalletOpportunity[], Error[]]>; // return all pools
  getUsersData?(chains: ChainId[], addresses: Address[]): Promise<[IPlatformUserEntry[], Error[]]>;
}

// TODO: CacheData, PoolData, UserData are all optional
// TODO: this should just be 1. initialization, meta, cache, pools, user
export interface IRootProtocol<TProtocolMeta extends IProtocolMeta = IProtocolMeta> {
  // sets all required metadata for the instance
  meta: TProtocolMeta;

  readonly protocolId: string;

  registerMeta(meta: TProtocolMeta): void; // TODO: SetMeta

  // returns formatted metadata from the instance
  getMeta(): IFeatureMeta;

  // generates a unique ID per protocol

  // Preparation steps (downloading the ABI)
  // This prepares any common utilities and sets common data
  // that is likely required for both getPoolData & getUsersData
  initialize?(): Promise<void>;

  // caches all pool data
  cachePoolData?(): Promise<IWalletMinimal[]>;

  // returns the fully hydrated, and formatted pool data
  getFormattedPoolData?(): Promise<[IWalletOpportunity[], Error[]]>;

  // returns the fully hydrated (with real-time prices) pool data
  getPoolData?(): Promise<[IWalletOpportunity[], Error[]]>;

  // filters pool data to only include user positions
  getUsersData?(addresses: Address[]): Promise<[Map<Address, IWalletUserEntry[]>, Error[]]>;
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
