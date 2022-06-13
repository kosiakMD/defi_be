import type { AbiItem } from 'web3-utils';

import type { Address, ChainDto, ChainId, ChainIdEnum } from '@app/common';
import { IPlatformLinks } from '@app/common/interfaces/platform.v3.links';

import { FeatureEnum } from './enums';
import { BaseWithTokens } from './interfaces/new.interfaces';
import type { ERC20Token } from './interfaces/tokens.common.interface';

export interface IFeatureMeta {
  chain: ChainDto;
  list: FeatureEnum[];
}

// minimum viable metadata
export interface IPlatformMeta {
  // Human Readable Name (Display Name)
  name: string;

  // Platform Slug/Key. Used in URL's and filenames
  slug: string;

  // All enabled features for this platform
  // (detected automatically based on registered protocols)
  features: IFeatureMeta[];

  // Social Media Links
  links: IPlatformLinks;
}
export interface IProtocolMeta {
  id?: string; // todo: should be required
  name: string;
  chain: ChainIdEnum;
  feature: FeatureEnum;
  links?: any; // TODO: match IFeaturedLinks, but this is callable functions to generate the urls
}

// TODO: Update BaseWithTokens any to be a generic extending the proper form
export type IWalletMinimal = BaseWithTokens<any, any, any, any>; // minimal form
export type IWalletOpportunity = BaseWithTokens<any, any, any, any>; // plain opportunity form
export type IWalletUserEntry = BaseWithTokens<any, any, any, any>; // user entry form

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

type IFunctionPredicateContext = { readonly: AbiItem[]; full: AbiItem[]; [key: string]: any };
export type IFunctionPredicate = (context: IFunctionPredicateContext) => (item: AbiItem) => boolean;
export type INamedFunctionPredicates = { [key: string]: IFunctionPredicate };
export type INamedFunctions = { [key: string]: AbiItem };
export type TokenMap = Map<string, ERC20Token>;

type GenericDataResponse<TDataType> = {
  data: TDataType;
  errors: Error[];
};

// Data Returned From getPoolData (from protocol or platform)
export type IPoolDataProtocolResponse<TWalletType extends IWalletOpportunity> = GenericDataResponse<
  TWalletType[]
>;
export type IUserDataProtocolResponse<TWalletType extends IWalletUserEntry> = GenericDataResponse<
  Map<Address, TWalletType[]>
>;

// Data returned from getUserData (from protocol or platform)
export type IPoolDataPlatformResponse = GenericDataResponse<IWalletOpportunity[]>;
export type IUserDataPlatformResponse = GenericDataResponse<IPlatformUserEntry[]>;

// common required platform interface
export interface IRootPlatform {
  getMeta(): IPlatformMeta;
  cachePoolData;
  getPoolData?(chains: ChainId[]): Promise<IPoolDataPlatformResponse>; // return all pools
  getUsersData?(chains: ChainId[], addresses: Address[]): Promise<IUserDataPlatformResponse>;
}

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
  getFormattedPoolData?(): Promise<IPoolDataProtocolResponse<IWalletOpportunity>>;

  // returns the fully hydrated (with real-time prices) pool data
  getPoolData?(): Promise<IPoolDataProtocolResponse<IWalletOpportunity>>;

  // filters pool data to only include user positions
  getUsersData?(addresses: Address[]): Promise<IUserDataProtocolResponse<IWalletUserEntry>>;
}
export interface IChainGroupedWallet {
  chain: ChainDto;
  features: FeatureEnum[];
  wallets: Map<string, IWalletUserEntry[]>;
}
