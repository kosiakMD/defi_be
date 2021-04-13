import { PriceQueryDto } from '../dto';

export * from './prices.interface';

export type HistoricalPricesRequest = PriceQueryDto;
export type CurrentPricesRequest = Omit<PriceQueryDto, 'timestamps'>;
