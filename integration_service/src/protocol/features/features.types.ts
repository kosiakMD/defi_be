import { FeatureDto } from '../../integrations/integrationFeatures';

// export type FeatureResultDto = FeatureDto | FeatureDto[] | Promise<FeatureDto | FeatureDto[]>;

export class FeatureResultDto<T = FeatureDto> {
  totalValue = 0;
  items: T[] = [];
}
