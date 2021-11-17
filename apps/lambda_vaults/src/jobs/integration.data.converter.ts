import { plainToClass } from 'class-transformer';

import { LiquidityPoolFeature, PoolTokenDto } from '@app/common/jobs/pools';
import {
  IntegrationClaimableTokenDto,
  IntegrationERC20TokenDto,
  IntegrationPoolTokenDto,
  IntegrationStakingPositionDto,
} from '@app/common/jobs/staking';
import { ERC20Token } from '@app/common/jobs/token';

import { TrackedVaultItem } from '../store/tracked.vault.item.entity';
import { TrackedVaultItemsMap } from './data/tracked.vault.items.map';

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
      } else if (typeof mapping[key] === 'object') {
        dto[key] = this.toDTO(mapping[key]);
      }
    });

    return dto;
  }

  private static buildFeatureDtoByDtoName(dtoName: string): any {
    switch (dtoName) {
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
    }

    return null;
  }
}
