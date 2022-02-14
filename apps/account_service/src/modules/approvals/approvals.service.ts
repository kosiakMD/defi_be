import { getManager } from 'typeorm';

import { Inject, Injectable, LoggerService } from '@nestjs/common';

import { CHAIN_ID_ETH } from '@app/common/constant';
import { ChainIdEnum } from '@app/common/enum';
import { ContractApprovalResponse } from '@app/common/interfaces';
import { Address } from '@app/common/types';

import { BlacklistService } from '../blacklists/blacklist.service';
import ApprovalMapper from './helpers/approvalMapper';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { ApprovalsRepository } from 'jobs/migration_events_consumer/src/store/repositories/approvals.repository';
import { ApprovalsEntity } from 'jobs/migration_events_consumer/src/store/entities/approvals.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { AssetsRepository } from 'jobs/migration_events_consumer/src/store/repositories/assets.repository';
import { AssetsEntity } from 'jobs/migration_events_consumer/src/store/entities/assets.entity';

@Injectable()
export class ApprovalsService {
  constructor(
    private readonly blacklistService: BlacklistService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService,
    @InjectRepository(ApprovalsEntity) private readonly approvalsRepository: ApprovalsRepository,
    @InjectRepository(AssetsEntity) private readonly assetsRepository: AssetsRepository,
    ) {
      setTimeout(() => {
        this.fixNullTokenData();
      }, 2000); // timeout to connect db driver
    }
  async getAllApprovals(addresses: Address): Promise<ContractApprovalResponse> {
    const allApprovals = {};
    if (!addresses) {
      return allApprovals;
    }

    const [ethApprovals] = await Promise.all([this.getApprovals(addresses, CHAIN_ID_ETH)]);

    return ethApprovals;
  }

  async getApprovals(addresses: Address, chainId: ChainIdEnum): Promise<ContractApprovalResponse> {
    let approvalsTableName;
    if (chainId === ChainIdEnum.eth) {
      approvalsTableName = 'approvals_new';
    } else {
      approvalsTableName = 'bsc_approvals';
    }

    let addressesArray: string[] = addresses.split(',');
    const blacklistedAddresses: string[] = await this.blacklistService.filterIsBlacklisted(
      addressesArray,
    );

    addressesArray = addressesArray.filter((a) => !blacklistedAddresses.find((b) => a === b));
    if (!addressesArray.length) {
      return {};
    }

    const addressesJoined: string = addressesArray.map((a) => `'${a.toLowerCase()}'`).join(',');
    const entityManager = getManager();
    const approvals: any[] = await entityManager.query(`
            select
              a.user_address,
              a.token_address           as token_address,
              a.contract_address        as contract_address,
              a.amount          as amount,
              a.block_number    as block_number,
              a.block_timestamp as block_timestamp,
              pc.project_id,
              pi.name as project_name,
              pi.description,
              pi.icon_project as icon,
              an.icon as token_icon,
              an.name as token_name,
              an.symbol as token_symbol,
              an.decimals as token_decimal
          from ${approvalsTableName} a
                   left join projects_contract pc on a.contract_address = pc.address
                   left join projects_info pi on pc.project_id = pi.id
                   left join assets_new an on a.asset_id = an.id and an.chain_id = 1
          where a.user_address in (${addressesJoined})
          `);
    return addressesArray.reduce((response, address) => {
      const singleAddressApprovals = approvals.filter(
        (approval) => approval['user_address'] === address.toLowerCase(),
      );
      return {
        ...response,
        [address]: ApprovalMapper(singleAddressApprovals, chainId),
      };
    }, {});
  }

  async fixNullTokenData(): Promise<void> {
    const approvalsChunk = Number(process.env.APPROVALS_CHUNK);
    if (approvalsChunk) {
      try {
        const approvalsNumber = await this.approvalsRepository.count();
        let page = 1;
        const limit = approvalsChunk;
        this.logger.log(`Try to fix ${approvalsNumber} approvals...`);
        while (limit * (page - 1) < approvalsNumber) {
          this.logger.log(`Processing page: ${page}, limit: ${limit}`);
          const offset = limit * (page - 1);
          const approvalsToProcess: any[] = await this.approvalsRepository.query(`
            select
              ap.asset_id,
              ap.token_address,
              ap.contract_address
            from approvals_new ap
              offset ${offset} limit ${limit}
          `);
          const promises = approvalsToProcess.map((approval) => {
            async function updateApproval(): Promise<number> {
              const asset = await this.assetsRepository.findOne({ address: approval.token_address, chainId: 1 });
              if (asset) {
                const query = `
                update approvals_new
                  set asset_id = ${asset.id}
                  where
                    token_address = '${approval.token_address}' and
                    contract_address = '${approval.contract_address}'
                `;
                await this.approvalsRepository.query(query);
                return 1;
              }
              return 0;
            }
            return updateApproval.call(this);
          });
          const results = await Promise.all(promises);
          this.logger.log(`RESULTS: ${results}`);
          page += 1;
        }
      } catch (error) {
        this.logger.error(`Error to fix approvals token null data: ${error.message}`);
      }
    }
  }
}
