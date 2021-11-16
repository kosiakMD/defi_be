import BigNumber from 'bignumber.js';
import { plainToClass } from 'class-transformer';
import { AbiItem } from 'web3-utils';

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

export function decodeOutput(abi: AbiItem, outputResult) {
  // if there is one output, it doesn't have a name (check abi)
  if (abi.outputs.length === 1) {
    return this.toInternalDataType(abi.outputs[0].type, outputResult[0]);
  }

  const decoded = {};
  abi.outputs.forEach((o) => {
    decoded[o.name] = this.toInternalDataType(o.type, outputResult[o.name]);
  });
  return decoded;
}

export function toInternalDataType(type: string, value: any) {
  if (type.includes('int')) {
    return new BigNumber(value);
  }
  return value;
}
