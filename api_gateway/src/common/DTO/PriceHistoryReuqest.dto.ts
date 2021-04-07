import { TokenHistorical } from '../interfaces';

export default class PriceHistoryRequestDTO implements TokenHistorical {
	addresses: string;

	timestamps: [];
}
