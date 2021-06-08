import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';

import { AssetsEntity } from './assets.entity';
import { AssetState } from './assets.interface';

export class AssetsDto {
  @ApiProperty({ type: Number, example: 13 })
  id: number;
  @ApiProperty({ type: String, example: '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9' })
  address: string;
  @ApiProperty({ type: String, example: 'Aave' })
  name: string;
  @ApiProperty({ type: String, example: 'AAVE' })
  symbol: string;
  @ApiProperty({ type: Number, example: 1 })
  chain: number;
  @ApiProperty({ type: Number, example: 18 })
  decimals: number;

  @Exclude()
  isReadyToMigrate: boolean;
  @Exclude()
  isMigrated: boolean;

  @ApiProperty({ type: String, example: AssetState.processing })
  @Expose()
  get status(): AssetState {
    return this.isReadyToMigrate // if not - processing not started = pending, f yes ->
      ? this.isMigrated // if not - processing started if yes - finished = ready,
        ? AssetState.ready
        : AssetState.processing
      : AssetState.pending;
  }

  constructor(assetEntity: AssetsEntity) {
    Object.assign(this, assetEntity);
  }
}
