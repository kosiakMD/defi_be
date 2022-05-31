import { Injectable } from '@nestjs/common';

import { CosmosBalancesStrategy } from './cosmos-balances.strategy';

@Injectable()
export class SecretBalancesStrategy extends CosmosBalancesStrategy {}
