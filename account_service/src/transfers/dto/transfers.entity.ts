// eslint-disable-next-line max-classes-per-file
import { Exclude, Transform } from 'class-transformer';
import { Column, Entity, PrimaryColumn } from 'typeorm';

// TODO  use Entity columns with @View aggregation and delete mapping at db service
@Entity({ name: 'asset_transfers' })
export class TransferEntity {
  // @PrimaryColumn()
  // id: number;
  @Exclude()
  @PrimaryColumn({ name: 'log_index' })
  logIndex: string;

  @PrimaryColumn({ name: 'tx_hash' })
  hash: string;

  @Column({ name: 'from' })
  fromAddress: string;

  @Column({ name: 'to' })
  toAddress: string;

  @Column({ name: 'timestamp' })
  blockTimeStamp: string;

  @Column({ name: 'value' })
  amount: string;

  // data from 'assets'
  // @ViewColumn({ name: 'address' })
  @Column({ name: 'asset_address' })
  @Transform(({ value }) => value.toLowerCase())
  tokenAddress: string;

  // @ViewColumn({ name: 'name' })
  @Column({ name: 'asset_name' })
  tokenName: string;

  // @ViewColumn({ name: 'symbol' })
  @Column({ name: 'asset_symbol' })
  tokenSymbol: string;

  // @ViewColumn({ name: 'decimals' })
  @Column({ name: 'asset_decimals' })
  tokenDecimals: number;

  @Exclude()
  assetId: string;

  tokenPrice = null;

  tokenPriceUSD = null;

  totalPriceUSD = null;

  // TODO: either @Transform or AfterLoad when Entity will be used for query with @View
  // @AfterLoad()
  // addressToLoweCase() {
  //   this.tokenAddress = this.tokenAddress.toLowerCase();
  // }

  constructor(transferEntity: TransferEntity) {
    Object.assign(this, transferEntity);
  }
}

@Entity({ name: 'assets' })
export class TransferTokenEntity {
  @PrimaryColumn()
  id: number;

  @Column({ name: 'address' })
  address: string;

  @Column({ name: 'name' })
  name: string;

  @Column({ name: 'symbol' })
  symbol: string;

  @Column({ name: 'decimals' })
  decimals: number;

  constructor(transferEntity: TransferEntity) {
    Object.assign(this, transferEntity);
  }
}
