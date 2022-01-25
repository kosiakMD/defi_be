// eslint-disable-next-line max-classes-per-file
import { Address, ChainIdEnum, IAssetResponseDto } from '@app/common';

export class ERC20TokenDto implements IAssetResponseDto {
  id: number;
  address: Address;
  name: string;
  symbol: string;
  decimals: number;
  chain: ChainIdEnum;
  isLp: boolean;
  isTracked: boolean;
  underlyingAssets?: ERC20TokenDto[];
}

export class PoolTokenDto extends ERC20TokenDto {
  positionInPool: number;
}

export class LiquidityPoolTokenDto extends ERC20TokenDto {
  positionInPool?: number = null;
  underlyingAssets: DbPoolTokenDto[];
}

export class DbPoolTokenDto extends ERC20TokenDto {
  positionInPool?: number = null;
  underlyingAssets: DbPoolTokenDto[];
}
