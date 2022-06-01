import { Injectable } from '@nestjs/common';

import { CosmosBalancesStrategy } from './cosmos.balances.strategy';

@Injectable()
export class OsmosisBalancesStrategy extends CosmosBalancesStrategy {}
