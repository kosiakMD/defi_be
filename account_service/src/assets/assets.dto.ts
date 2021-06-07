import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';

import { AssetsEntity } from './assets.entity';
import { AssetState } from './assets.interface';

export class AssetsDto {
  @ApiProperty({ type: String, example: 13 })
  id;
  @ApiProperty({ type: String, example: '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9' })
  address;
  @ApiProperty({ type: String, example: 'Aave' })
  name;
  @ApiProperty({ type: String, example: 'AAVE' })
  symbol;
  @ApiProperty({ type: Number, example: 1 })
  chain;
  @ApiProperty({ type: Number, example: 18 })
  decimals;

  @Exclude()
  @ApiProperty({ type: Boolean, example: true })
  isReadyToMigrate;

  @Exclude()
  @ApiProperty({ type: Boolean, example: false })
  isHistoricalDataMigrated;

  @ApiProperty({ type: String, example: AssetState.processing })
  @Expose()
  get status(): AssetState {
    return this.isReadyToMigrate // if not - processing not started = pending, f yes ->
      ? this.isHistoricalDataMigrated // if not - processing started if yes - finished = ready,
        ? AssetState.ready
        : AssetState.processing
      : AssetState.pending;
  }

  constructor(assetEntity: AssetsEntity) {
    Object.assign(this, assetEntity);
  }
}
