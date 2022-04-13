import { EndpointsEntity } from './endpoints.entity';
import { EndpointsSuccessScore } from './endpoints.enums';

export type SuccessScore = {
  value: EndpointsSuccessScore;
  timestamp: number;
};
export type EndpointToRPCCall = {
  successRate: number;
  endpointsEntity: EndpointsEntity;
};
