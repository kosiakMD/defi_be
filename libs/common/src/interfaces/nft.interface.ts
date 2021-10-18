import { Address } from '..';
import { AssetDto } from '../dto/nft';

export type AssetsByAccount = Record<Address, AssetDto[]>;
