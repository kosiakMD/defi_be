import { plainToClass } from 'class-transformer';

import {
  CurveLiquidityPoolFeature,
  CurvePoolTokenDto,
  CurveUnderlyingLpDto,
  LiquidityPoolFeature,
  PoolTokenDto,
} from '@app/common/jobs/pools';
import {
  CurveIntegrationERC20TokenDto,
  CurveIntegrationStakingPositionDto,
  IntegrationClaimableTokenDto,
  IntegrationERC20TokenDto,
  IntegrationPoolTokenDto,
  IntegrationStakingPositionDto,
  UnderlyingStakingLp,
} from '@app/common/jobs/staking';
import { ERC20Token } from '@app/common/jobs/token';

import { TrackedVaultItem } from '../store/tracked.vault.item.entity';
import { TrackedVaultItemsMap } from './data/tracked.vault.items.map';

export class IntegrationDataConverter {
  static toDTO(mapping) {
    if (!mapping) return null;
    const itemData = TrackedVaultItemsMap.get(mapping['dbId']) as TrackedVaultItem;
    const dto = IntegrationDataConverter.buildFeatureDtoByDtoName(mapping['dtoName']);
    if (!dto) {
      throw new Error(`Failed to get DTO '${mapping['dtoName']}'`);
    }
    Object.keys(dto).forEach((key) => {
      // set up simple types, null is also object
      if (dto[key] === null || typeof dto[key] !== 'object' || key === 'extra') {
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
      } else if (typeof mapping[key] === 'object') {
        dto[key] = this.toDTO(mapping[key]);
      }
    });

    return dto;
  }

  private static buildFeatureDtoByDtoName(dtoName: string): any {
    switch (dtoName) {
      case CurveIntegrationStakingPositionDto.name:
        return plainToClass(CurveIntegrationStakingPositionDto, {});
      case CurveIntegrationERC20TokenDto.name:
        return plainToClass(CurveIntegrationERC20TokenDto, {});
      case IntegrationStakingPositionDto.name:
        return plainToClass(IntegrationStakingPositionDto, {});
      case IntegrationClaimableTokenDto.name:
        return plainToClass(IntegrationClaimableTokenDto, {});
      case IntegrationERC20TokenDto.name:
        return plainToClass(IntegrationERC20TokenDto, {});
      case IntegrationPoolTokenDto.name:
        return plainToClass(IntegrationPoolTokenDto, {});
      case PoolTokenDto.name:
        return plainToClass(PoolTokenDto, {});
      case LiquidityPoolFeature.name:
        return plainToClass(LiquidityPoolFeature, {});
      case ERC20Token.name:
        return plainToClass(ERC20Token, {});
      // TODO:
      case CurvePoolTokenDto.name: // mine
        return plainToClass(CurvePoolTokenDto, {}); // mine
      case UnderlyingStakingLp.name: // theirs
        return plainToClass(UnderlyingStakingLp, {}); // theirs
      case CurveUnderlyingLpDto.name: // theirs
        return plainToClass(CurveUnderlyingLpDto, {}); // theirs
      case CurveLiquidityPoolFeature.name: // theirs
        return plainToClass(CurveLiquidityPoolFeature, {});
    }

    return null;
  }
}
