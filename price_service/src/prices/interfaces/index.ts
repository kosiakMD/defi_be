import { PriceQueryDto } from '../dto';

export type HistoricalPricesRequest = PriceQueryDto;
export type CurrentPricesRequest = Omit<PriceQueryDto, 'timestamps'>;
