import { Address } from '@app/common';
import { ChainIdEnum } from '@app/common/enum';

import { CurrentPricesPayload, PriceResponseDto } from '../../common/dto/price.response.dto';

export interface PriceServiceInterface {
  /**
   * Fetches token prices in bulk
   * @param addresses Token Addresses
   * @param chainId Chain ID
   */
  getTokenPricesFetch(
    addresses: Address[],
    chainId: ChainIdEnum,
  ): Promise<PriceResponseDto<CurrentPricesPayload>>;
}
