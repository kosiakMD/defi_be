// eslint-disable-next-line max-classes-per-file
import { Transform } from 'class-transformer';
import { Column, Connection, Entity, PrimaryColumn, ViewEntity } from 'typeorm';

// TODO  use Entity columns with @View aggregation and delete mapping at db service
@ViewEntity({
  expression: (connection: Connection) =>
    connection
      .createQueryBuilder()
      // .select('tsf.tx_hash'/*, 'hash'*/)
      // .addSelect('tsf.from'/*, 'fromAddress'*/)
      // .addSelect('tsf.to'/*, 'toAddress'*/)
      // .addSelect('tsf.timestamp'/*, 'blockTimestamp'*/)
      // .addSelect('tsf.value'/*, 'amount'*/)
      // .addSelect('as.address'/*, 'tokenAddress'*/)
      // .addSelect('as.name', 'tokenName')
      // .addSelect('as.symbol'/*, 'tokenSymbol'*/)
      // .addSelect('as.decimals'/*, 'tokenDecimals'*/)
      // .leftJoin(AssetsEntity, 'as', 'tsf.asset_id = as.id')
      // .leftJoinAndSelect("tsf.tokenAddress", "address")
      .leftJoinAndSelect(TransferTokenEntity, 'asset', 'tsf.asset_id = asset.id')
      // .where('as.chain_id = :chainId', { chainId: chainId })
      // .where(`asset.chain_id = ${chainId}`)
      .andWhere('asset.is_migrated = true')
      // .andWhere(
      //   new Brackets((qb) => {
      //     qb.where(`tsf.from IN (${addressesString})`).orWhere(`tsf.to IN (${addressesString})`);
      //   }),
      // )
      .orderBy('tsf.id', 'DESC')
      .limit(10e3),
})
@Entity({ name: 'asset_transfers' })
export class TransferEntity {
  @PrimaryColumn()
  id: number;

  @Column({ name: 'tx_hash' })
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
