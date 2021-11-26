import BigNumber from 'bignumber.js';
import { plainToClass } from 'class-transformer';
import { AbiItem } from 'web3-utils';

import {
  CurveLiquidityPoolFeature,
  CurveUnderlyingLpDto,
  LiquidityPoolFeature,
  PoolTokenDto,
} from '@app/common/jobs/pools';
import { ERC20Token } from '@app/common/jobs/token';

import { DbPoolTokenDto, LiquidityPoolTokenDto } from '../microservices/dto/account/account.dto';

export const UNIV2_POOL_TOKEN_WEIGHT = 0.5;

export function decodeOutput(abi: AbiItem, outputResult) {
  // if there is one output, it doesn't have a name (check abi)
  if (abi.outputs.length === 1) {
    return toInternalDataType(abi.outputs[0].type, outputResult[0]);
  }

  const decoded = {};
  abi.outputs.forEach((o) => {
    decoded[o.name] = toInternalDataType(o.type, outputResult[o.name]);
  });
  return decoded;
}

export function toInternalDataType(type: string, value: any) {
  if (type.includes('int')) {
    return new BigNumber(value);
  }
  return value;
}

export function toCurveLiquidityPoolFeature(
  lpTokenData: DbPoolTokenDto | LiquidityPoolTokenDto,
): CurveLiquidityPoolFeature {
  const poolFeature = plainToClass(CurveLiquidityPoolFeature, {
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
  });

  const tokens = [];

  lpTokenData.underlyingAssets.forEach((pt) => {
    if (pt.underlyingAssets?.length) {
      const lp = plainToClass(CurveUnderlyingLpDto, {
        address: pt.address,
        name: pt.name,
        symbol: pt.symbol,
        decimals: pt.decimals,
        positionInPool: pt.positionInPool,
      });
      lp.tokens.push(
        ...pt.underlyingAssets.map((underlying) => {
          return plainToClass(PoolTokenDto, {
            address: underlying.address,
            name: underlying.name,
            symbol: underlying.symbol,
            decimals: underlying.decimals,
            positionInPool: underlying.positionInPool,
          });
        }),
      );
      tokens.push(lp);
    } else {
      tokens.push(
        plainToClass(PoolTokenDto, {
          address: pt.address,
          name: pt.name,
          symbol: pt.symbol,
          decimals: pt.decimals,
          positionInPool: pt.positionInPool,
        }),
      );
    }
  });
  poolFeature.tokens = tokens;
  return poolFeature;
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
