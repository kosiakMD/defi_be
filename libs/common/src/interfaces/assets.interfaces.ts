import { ChainIdEnum } from '@app/common';
import { AssetState } from '@app/common/enum';

export interface IAssetDto {
  id: number;
  address: string;
  name: string;
  symbol: string;
  chain: ChainIdEnum;
  decimals: number;
  status: AssetState;
}

export interface IAssetToken {
  id: number;
  address: string;
  name: string;
  symbol: string;
  chain: ChainIdEnum;
  decimals: number;
  isLp: boolean;
  isTracked: boolean;
  positionInPool?: number;
}

export interface IAssetResponseDto extends IAssetToken {
  underlyingAssets?: IAssetToken[];
}
