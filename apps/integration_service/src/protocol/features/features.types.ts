import { FeatureDto } from '../../integrations/integrations.dto';

export interface FeatureResult<T = FeatureDto> {
  totalValue: number;
  items: T[];
}
