// eslint-disable-next-line max-classes-per-file
import { classToPlain, plainToClass } from 'class-transformer';

import { ChainIdEnum } from '@app/common';
import {
  IntegrationClaimableTokenDto,
  IntegrationERC20TokenDto,
  IntegrationPoolTokenDto,
  IntegrationStakingPositionDto,
} from '@app/common/jobs/staking';
import { ERC20Token } from '@app/common/jobs/token';
import { concatStrings } from '@app/common/utils';

import { StoreService } from '../../store/store.service';
import { TrackedVaultItem } from '../../store/tracked.vault.item.entity';
import { TrackedVaultItemsMap } from '../data/tracked.vault.items.map';
import { StakingFeatureMapping } from '../dto/mappings';
import { AutofarmAddressesBSC } from './addresses';
import { AutofarmAddressesPLG } from './addresses';

export class DbMapping {
  private availableDtosForConversion: Map<string, string>;

  constructor(private readonly storeService: StoreService) {
    this.availableDtosForConversion = new Map<string, string>([
      [IntegrationStakingPositionDto.name, IntegrationStakingPositionDto.name],
      [IntegrationERC20TokenDto.name, ERC20Token.name],
      [IntegrationClaimableTokenDto.name, ERC20Token.name],
      [IntegrationPoolTokenDto.name, ERC20Token.name],
    ]);
  }

  async toDbMapping(stakingPosition: IntegrationStakingPositionDto, chain: ChainIdEnum) {
    const mappedDto = plainToClass(StakingFeatureMapping, {});

    //reward token
    if (chain === ChainIdEnum.plg) {
      const rewardTokenUniqueIdMATIC = concatStrings(chain, AutofarmAddressesPLG.maticPLG);
      const rewardTokenUniqueIdAUTO = concatStrings(chain, AutofarmAddressesPLG.autoPLG);

      const rewardTokenItemMATIC: TrackedVaultItem = await this.getDbItem(
        stakingPosition.rewards[0],
        rewardTokenUniqueIdAUTO,
      );
      const rewardTokenItemAUTO: TrackedVaultItem = await this.getDbItem(
        stakingPosition.rewards[1],
        rewardTokenUniqueIdMATIC,
      );

      mappedDto.rewards = [
        {
          dbId: rewardTokenItemMATIC.id,
          dtoName: stakingPosition.rewards[0].constructor.name,
        },
        {
          dbId: rewardTokenItemAUTO.id,
          dtoName: stakingPosition.rewards[1].constructor.name,
        },
      ];
    } else {
      const rewardTokenUniqueIdAUTO = concatStrings(chain, AutofarmAddressesBSC.autoBSC);

      const rewardTokenItemAUTO: TrackedVaultItem = await this.getDbItem(
        stakingPosition.rewards[0],
        rewardTokenUniqueIdAUTO,
      );

      mappedDto.rewards = [
        {
          dbId: rewardTokenItemAUTO.id,
          dtoName: stakingPosition.rewards[0].constructor.name,
        },
      ];
    }

    // staking token
    const stakingTokenUniqueId = concatStrings(chain, stakingPosition.stakingToken.address);
    const stakingToken: TrackedVaultItem = await this.getDbItem(
      stakingPosition.stakingToken,
      stakingTokenUniqueId,
    );
    mappedDto.stakingToken = {
      dbId: stakingToken.id,
      dtoName: stakingPosition.stakingToken.constructor.name,
    };

    // staking lp assets underlying
    if (stakingPosition.stakingToken.tokens) {
      mappedDto.stakingToken.tokens = [];
      for (const t of stakingPosition.stakingToken.tokens) {
        const tokenId = concatStrings(chain, t.address);
        const tokenItem: TrackedVaultItem = await this.getDbItem(t, tokenId);
        mappedDto.stakingToken.tokens.push({
          dbId: tokenItem.id,
          dtoName: t.constructor.name,
          positionInPool: t.positionInPool,
        });
      }
    }

    // position
    const positionUniqueId = concatStrings(chain, stakingPosition.address, stakingPosition.poolId);

    const position: TrackedVaultItem = await this.getDbItem(stakingPosition, positionUniqueId);
    mappedDto.dbId = position.id;
    mappedDto.dtoName = stakingPosition.constructor.name;

    return mappedDto;
  }

  async getDbItem(item, uniqueId: string): Promise<TrackedVaultItem> {
    const temp = TrackedVaultItemsMap.get(uniqueId);
    return temp ?? this.saveItemToDb(item, uniqueId);
  }

  async saveItemToDb(item, uniqueId: string): Promise<TrackedVaultItem> {
    let universalDto;

    const newIntegrationJobItem: TrackedVaultItem = plainToClass(TrackedVaultItem, {});
    const toUniversalDtoName = this.availableDtosForConversion.get(item.constructor.name);
    newIntegrationJobItem.type = toUniversalDtoName;

    if (toUniversalDtoName === ERC20Token.name) {
      universalDto = {
        address: item.address,
        name: item.name,
        symbol: item.symbol,
        decimals: item.decimals,
      };
      newIntegrationJobItem.name = universalDto.name;
      newIntegrationJobItem.idUnique = uniqueId;
    }
    if (toUniversalDtoName === IntegrationStakingPositionDto.name) {
      universalDto = {
        address: item.address,
        poolId: item.poolId,
        poolName: item.poolName,
      };
      newIntegrationJobItem.name = universalDto.poolName
        ? universalDto.poolName
        : universalDto.poolId;
      newIntegrationJobItem.idUnique = uniqueId;
    }

    newIntegrationJobItem.data = classToPlain(universalDto);

    const savedItem: TrackedVaultItem = await this.storeService.saveItem(newIntegrationJobItem);

    // it is important to add item to database
    TrackedVaultItemsMap.add(savedItem);
    return savedItem;
  }
}
