import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Inject, Injectable, LoggerService } from '@nestjs/common';

import { DatabaseService } from '../jobs/db/database.service';
import { Vault } from './dto/vault.dto';
import { VaultsServiceSushiswap } from './sushiswap/vaults.service.sushiswap';

@Injectable()
export class VaultsService {
  constructor(
    private readonly sushiswapVaultsService: VaultsServiceSushiswap,
    private readonly databaseService: DatabaseService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: LoggerService,
  ) {}

  async saveVaults(): Promise<Vault[]> {
    try {
      const databaseClient = await this.databaseService.getClient();
      const vaults: Vault[] = await this.sushiswapVaultsService.getVauts();

      const query = this.buildInsertVaultsQuery(vaults);
      await databaseClient.query(query);
      this.logger.log(`vaults import completed in total [${vaults.length}]`, 'VaultsService');
      return vaults;
    } catch (e) {
      this.logger.error(e, 'VaultsService');
      this.logger.error('vaults import failed with error', 'VaultsService');
      return [];
    }
  }

  private buildInsertVaultsQuery(vaults: Vault[]): string {
    const queryStart = `
        INSERT INTO vaults
        (id,
         vault_id,
         vault_name,
         project,
         chain,
         apy,
         tvl,
         lp_token,
         liquidity_pool_tokens,
         reward_token,
         created_at,
         updated_at)
        VALUES`;

    const valuesConcatenated = vaults
      .filter((value) => value !== undefined)
      .map((v) => {
        return `(
					default, 
					'${v.id}', 
					'${v.name}', 
					'${v.project}',
					'${v.chain}',
					'${JSON.stringify(v.apy)}',
					'${v.tvl}',
					'${JSON.stringify(v.lpToken).replace("'", "''")}',
					'${JSON.stringify(v.liquidityPoolTokens).replace("'", "''")}',
					'${JSON.stringify(v.rewardToken).replace("'", "''")}',
					current_timestamp,
					current_timestamp
					)`;
      })
      .join(',');

    const queryEnd = `
			on conflict (vault_id) do update
			set
        vault_name = excluded.vault_name,
        project = excluded.project,
        chain = excluded.chain,
        apy = excluded.apy,
        tvl = excluded.tvl,
        lp_token = excluded.lp_token,
        liquidity_pool_tokens = excluded.liquidity_pool_tokens,
        reward_token = excluded.reward_token,
				updated_at = current_timestamp
		`;
    return queryStart.concat(valuesConcatenated).concat(queryEnd);
  }
}
