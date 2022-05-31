import { CallsStatistic } from '../../common/dto/calls-statistic.dto';

import { EndpointEntity } from './endpoint.entity';
import { EndpointsSuccessScore } from './endpoints.enums';

export type SuccessScore = {
  value: EndpointsSuccessScore;
  timestamp: number;
};
export type EndpointToRPCCall = {
  callsStatistic: CallsStatistic;
  endpointsEntity: EndpointEntity;
};
