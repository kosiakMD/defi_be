import { PriceAble } from '.';
import { ERC20Token } from './transactions.dto';

export class LendingToken extends ERC20Token implements PriceAble {
  priceUSD: number;
}
