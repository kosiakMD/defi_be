import { IFetchPriceRequest } from '../../../common/interfaces/fetch.price.request.interface';
import { IFetchPriceResponse } from '../../../common/interfaces/fetch.price.response.interface';

export interface INftPricesProvider {
  fetchPrices(request: IFetchPriceRequest): Promise<IFetchPriceResponse>;
}
