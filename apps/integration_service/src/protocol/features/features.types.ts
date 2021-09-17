import { FeatureDto } from '../../integrations/integrationFeatures';

// export type FeatureResult = FeatureDto | FeatureDto[] | Promise<FeatureDto | FeatureDto[]>;

export interface FeatureResult<T = FeatureDto> {
  totalValue: number;
  items: T[];
}
