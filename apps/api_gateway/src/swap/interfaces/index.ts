import { NetworkEnum } from '../const';
import { TokensPricesByTokensQueryDto } from '../dto/tokens.prices.by.tokens.query.dto';

export interface SwapPricesQuery {
  from: string;
  to: string;
  amount: number;
  side: string;
  network: NetworkEnum;
}

export type TokensPricesByTokens = TokensPricesByTokensQueryDto;
