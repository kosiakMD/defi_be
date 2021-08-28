import { FeatureDto } from '../../integrations/integrationFeatures';

export type FeatureResult = FeatureDto | FeatureDto[] | Promise<FeatureDto | FeatureDto[]>;
