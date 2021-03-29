import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';

import AssetPrice from './asset_price.entity';

@Entity({ name: 'prices.asset' })
class Asset {
	@PrimaryGeneratedColumn()
	public id: number;

	@Column()
	public symbol: string;

	@Column()
	public address: string;

	@Column()
	public name: string;

	@Column()
	public type: string;

	@Column()
	public platform_id: number;

	@Column()
	public is_new: boolean;

	@OneToMany(() => AssetPrice, (asset_price: AssetPrice) => asset_price.asset)
	public asset_prices: AssetPrice[];
}

export default Asset;
