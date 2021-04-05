import { PriceHistoricalRequest } from '../interfaces';

export default class PriceHistoryRequestDTO implements PriceHistoricalRequest {
	addresses: [];

	timestamps: [];
}
