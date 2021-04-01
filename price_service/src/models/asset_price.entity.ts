import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';

import Asset from './asset.entity';

@Entity({ name: 'prices.asset_price' })
class AssetPrice {
	@PrimaryColumn()
	public asset_id: number;

	@Column()
	public currency_id: number;

	@Column()
	public value: number;

	@Column()
	public timestamp: number;

	@ManyToOne(() => Asset, (asset: Asset) => asset.asset_prices)
	@JoinColumn({ name: 'asset_id' })
	public asset: Asset;
}

export default AssetPrice;
