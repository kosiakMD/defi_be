// eslint-disable-next-line max-classes-per-file
export class ERC20TokenDto {
  address: string = null;
  name: string = null;
  symbol: string = null;
  decimals: number = null;
  chain: number;
  isLp = false;
}

export class PoolTokenDto extends ERC20TokenDto {
  positionInPool: number;
}

export class LiquidityPoolTokenDto extends ERC20TokenDto {
  underlyingAssets: PoolTokenDto[];
}
