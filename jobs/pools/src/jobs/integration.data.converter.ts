import { plainToClass } from 'class-transformer';

import { TrackedVaultItem } from '../store/tracked.vault.item.entity';
import { TrackedVaultItemsMap } from './data/tracked.vault.items.map';
import { ERC20Token } from './dto/common';
import { CurveLiquidityPoolFeature, CurvePoolTokenDto, LiquidityPoolFeature, PoolTokenDto } from './dto/pools.dto';
import {
  IntegrationClaimableTokenDto,
  IntegrationERC20TokenDto,
  IntegrationPoolTokenDto,
  IntegrationStakingPositionDto,
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
    let converted;

    // set up object with default values
    if (dtoName === 'IntegrationStakingPositionDto') {
      converted = plainToClass(IntegrationStakingPositionDto, {});
    }
    if (dtoName === 'CurvePoolTokenDto') {
      converted = plainToClass(CurvePoolTokenDto, {});
    }
    if (dtoName === 'IntegrationClaimableTokenDto') {
      converted = plainToClass(IntegrationClaimableTokenDto, {});
    }
    if (dtoName === 'IntegrationERC20TokenDto') {
      converted = plainToClass(IntegrationERC20TokenDto, {});
    }
    if (dtoName === 'IntegrationPoolTokenDto') {
      converted = plainToClass(IntegrationPoolTokenDto, {});
    }
    if (dtoName === 'PoolTokenDto') {
      converted = plainToClass(PoolTokenDto, {});
    }
    if (dtoName === 'CurveLiquidityPoolFeature') {
      converted = plainToClass(CurveLiquidityPoolFeature, {});
    }
    if (dtoName === 'LiquidityPoolFeature') {
      converted = plainToClass(LiquidityPoolFeature, {});
    }
    if (dtoName === 'ERC20Token') {
      converted = plainToClass(ERC20Token, {});
    }

    return converted;
  }
}
