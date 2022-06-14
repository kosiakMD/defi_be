import { AdapterOptions, AdapterResults } from '../types/opportunity.adapter.types';

export interface IOpportunityAdapter {
  loadData(options?: AdapterOptions): Promise<AdapterResults>;
}
