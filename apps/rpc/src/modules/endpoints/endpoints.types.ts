import { CallsStatistic } from '../../common/dto/CallsStatistic.dto';

import { EndpointEntity } from './endpoint.entity';
import { EndpointCallScore } from './endpoints.enums';

export type SuccessScore = {
  value: EndpointCallScore;
  timestamp: number;
};

export type EndpointStatistic = {
  callsStatistic: CallsStatistic;
  endpoint: EndpointEntity;
};
