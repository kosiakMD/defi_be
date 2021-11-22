import { plainToClass } from 'class-transformer';

import { TrackedVaultItem } from '../store/tracked.vault.item.entity';
import { TrackedVaultItemsMap } from './data/tracked.vault.items.map';
import { ERC20Token } from './dto/common';
import {
  CurveLiquidityPoolFeature,
  CurvePoolTokenDto,
  CurveUnderlyingLpDto,
  LiquidityPoolFeature,
  PoolTokenDto,
} from './dto/pools.dto';
import {
  IntegrationClaimableTokenDto,
  IntegrationERC20TokenDto,
  IntegrationPoolTokenDto,
  IntegrationStakingPositionDto,
  UnderlyingStakingLp,
} from './dto/staking.dto';

export class IntegrationDataConverter {
  static toDTO(mapping) {
    const itemData = TrackedVaultItemsMap.get(mapping['dbId']) as TrackedVaultItem;
    const dto = IntegrationDataConverter.buildFeatureDtoByDtoName(mapping['dtoName']);

    Object.keys(dto).forEach((key) => {
      // set up simple types, null is also object
      if (dto[key] === null || typeof dto[key] !== 'object') {
        const defaultValue = dto[key];
        dto[key] =
          mapping[key] !== null && mapping[key] !== undefined ? mapping[key] : itemData.data[key];
        // keep default dto value if undefined value got
        dto[key] = dto[key] === undefined ? defaultValue : dto[key];
      }
    });

    Object.keys(mapping).forEach((key) => {
      if (Array.isArray(mapping[key])) {
        dto[key] = mapping[key].map((mp) => {
          return this.toDTO(mp);
        });
      } else if (typeof mapping[key] === 'object' && mapping[key]) {
        dto[key] = this.toDTO(mapping[key]);
      }
    });

    return dto;
  }

  private static buildFeatureDtoByDtoName(dtoName: string): any {
    // set up object with default values
    if (dtoName === 'IntegrationStakingPositionDto') {
      return plainToClass(IntegrationStakingPositionDto, {});
    }
    if (dtoName === 'CurvePoolTokenDto') {
      return plainToClass(CurvePoolTokenDto, {});
    }
    if (dtoName === 'UnderlyingStakingLp') {
      return plainToClass(UnderlyingStakingLp, {});
    }
    if (dtoName === 'IntegrationClaimableTokenDto') {
      return plainToClass(IntegrationClaimableTokenDto, {});
    }
    if (dtoName === 'IntegrationERC20TokenDto') {
      return plainToClass(IntegrationERC20TokenDto, {});
    }
    if (dtoName === 'UnderlyingStakingLp') {
      return plainToClass(UnderlyingStakingLp, {});
    }
    if (dtoName === 'CurveUnderlyingLpDto') {
      return plainToClass(CurveUnderlyingLpDto, {});
    }
    if (dtoName === 'IntegrationPoolTokenDto') {
      return plainToClass(IntegrationPoolTokenDto, {});
    }
    if (dtoName === 'PoolTokenDto') {
      return plainToClass(PoolTokenDto, {});
    }
    if (dtoName === 'CurveLiquidityPoolFeature') {
      return plainToClass(CurveLiquidityPoolFeature, {});
    }
    if (dtoName === 'LiquidityPoolFeature') {
      return plainToClass(LiquidityPoolFeature, {});
    }
    if (dtoName === 'ERC20Token') {
      return plainToClass(ERC20Token, {});
    }
    return;
  }
}
