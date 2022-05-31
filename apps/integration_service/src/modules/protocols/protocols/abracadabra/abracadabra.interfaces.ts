import { Address, ChainDto } from '@app/common';
import { ERC20Token } from '@app/common/dto/erc20-token';

import { BaseData } from '../../../../common/interfaces/transactions.interfaces';

export interface IFeature {
  getData(addresses: Address[], chain: ChainDto): Promise<BaseData[]>;
}

export class Cauldron {
  address: string; // cauldron address
  collateralAsset: ERC20Token; // get collateral token,
  collateralPrice: number;
  borrowAsset: ERC20Token; // borrow token
  borrowPrice: number;
  collateralizationRate: number; // COLLATERIZATION_RATE
  apy: number; //accrue-info
}
