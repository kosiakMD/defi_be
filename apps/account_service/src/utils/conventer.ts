import BigNumber from 'bignumber.js';
import { plainToClass } from 'class-transformer';
import { AbiItem } from 'web3-utils';

import { LiquidityPoolTokenDto } from '../chain/dto/account.dto';
import { ERC20Token } from '../chain/dto/common';
import { LiquidityPoolFeature, PoolTokenDto } from '../chain/dto/pools.dto';

export const UNIV2_POOL_TOKEN_WEIGHT = 0.5;

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

export function toLiquidityPoolFeature(lpTokenData: LiquidityPoolTokenDto): LiquidityPoolFeature {
  return plainToClass(LiquidityPoolFeature, {
    address: lpTokenData.address,
    name: lpTokenData.underlyingAssets
      .sort((a, b) => a.positionInPool - b.positionInPool)
      .map((pt) => pt.symbol)
      .join('/'),
    lpToken: plainToClass(ERC20Token, {
      address: lpTokenData.address,
      name: lpTokenData.name,
      symbol: lpTokenData.symbol,
      decimals: lpTokenData.decimals,
    }),
    tokens: lpTokenData.underlyingAssets.map((pt) => {
      return plainToClass(PoolTokenDto, {
        address: pt.address,
        name: pt.name,
        symbol: pt.symbol,
        decimals: pt.decimals,
        positionInPool: pt.positionInPool,
        weight: UNIV2_POOL_TOKEN_WEIGHT,
      });
    }),
  });
}
