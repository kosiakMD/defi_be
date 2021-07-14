import { ApiProperty } from '@nestjs/swagger';
import { Exclude, Expose } from 'class-transformer';
import { AfterLoad, Column, Entity, PrimaryColumn } from 'typeorm';

import { AssetState } from './assets.interface';

@Entity({ name: 'assets_new', orderBy: { name: 'ASC' } })
export class AssetsEntity {
  @AfterLoad()
  idToNumber(): void {
    this.id = Number(this.id);
  }

  @ApiProperty({ type: Number, example: 13 })
  @PrimaryColumn()
  // @Transform(({ value }) => Number(value))
  id: number;

  @ApiProperty({ type: String, example: '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9' })
  @Column({ name: 'address' })
  address: string;

  @ApiProperty({ type: String, example: 'Aave' })
  @Column({ name: 'name' })
  name: string;

  @ApiProperty({ type: String, example: 'AAVE' })
  @Column({ name: 'symbol' })
  symbol: string;

  @ApiProperty({
    type: String,
    example:
      'https://c.files.bbci.co.uk/16620/production/_91408619_55df76d5-2245-41c1-8031-07a4da3f313f.jpg',
  })
  @Column({ name: 'icon' })
  @Exclude()
  icon: string;

  @ApiProperty({ type: Number, example: 1 })
  @Column({ name: 'chain_id' })
  chain: number;

  @ApiProperty({ type: Number, example: 18 })
  @Column({ name: 'decimals' })
  decimals: number;

  @ApiProperty({ type: Boolean, example: true })
  @Column({ name: 'is_ready_to_migrate' })
  @Exclude()
  isReadyToMigrate: boolean;

  @ApiProperty({ type: Boolean, example: false })
  @Column({ name: 'is_migrated' })
  @Exclude()
  isMigrated: boolean;

  @ApiProperty({ type: Boolean, example: false })
  @Exclude()
  @Column({ name: 'is_lp' })
  isLp: boolean;

  @ApiProperty({ type: String, example: AssetState.processing })
  @Expose()
  get status(): AssetState {
    return this.isReadyToMigrate && this.isMigrated ? AssetState.ready : AssetState.pending;
  }
}
