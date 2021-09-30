import { plainToClass } from 'class-transformer';

import {
  ERC20TokenDto,
  LiquidityPoolFeature,
  PoolTokenDto,
} from '../liquiditypool/integrations.dto';
import { LiquidityPoolTokenDto } from '../microservices/dto/account/account.dto';

export function toLiquidityPoolFeature(lpTokenData: LiquidityPoolTokenDto): LiquidityPoolFeature {
  const lpToken: ERC20TokenDto = plainToClass(ERC20TokenDto, lpTokenData, {
    excludeExtraneousValues: true,
  });
  const liquidityPoolFeature = plainToClass(LiquidityPoolFeature, {});
  liquidityPoolFeature.address = lpTokenData.address;
  liquidityPoolFeature.name = lpTokenData.underlyingAssets.map((ua) => ua.symbol).join('/');
  liquidityPoolFeature.lpToken = lpToken;
  lpTokenData.underlyingAssets.forEach((pt) => {
    const poolToken: PoolTokenDto = plainToClass(PoolTokenDto, pt, {
      excludeExtraneousValues: true,
    });
    liquidityPoolFeature.tokens.push(poolToken);
  });
  return liquidityPoolFeature;
}
