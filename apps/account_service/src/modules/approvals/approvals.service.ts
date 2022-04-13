import { getManager } from 'typeorm';

import { Injectable } from '@nestjs/common';

import { ChainNameEnum } from '@app/common';
import { ContractApprovalResponse } from '@app/common/interfaces';

import { GetAllApprovalsDto } from '../../common/dto/GetAllApprovals.dto';

import { BlacklistService } from '../blacklists/blacklist.service';
import { ChainsService } from '../chains/chains.service';
import ApprovalMapper from './helpers/approvalMapper';

@Injectable()
export class ApprovalsService {
  constructor(
    private readonly blacklistService: BlacklistService,
    private readonly chainsService: ChainsService,
  ) {}
  async getAllApprovals(
    getAllApprovalsQuery: GetAllApprovalsDto,
  ): Promise<ContractApprovalResponse> {
    const allApprovals = {};
    if (!getAllApprovalsQuery.address) return allApprovals;
    const chainIdEth = await this.chainsService.getChainIdByName(ChainNameEnum.eth);
    const [ethApprovals] = await Promise.all([this.getApprovals(getAllApprovalsQuery, chainIdEth)]);
    return ethApprovals;
  }

  async getApprovals(
    getAllApprovalsQuery: GetAllApprovalsDto,
    chainId: number,
  ): Promise<ContractApprovalResponse> {
    let approvalsTableName;
    if (chainId === (await this.chainsService.getChainIdByName(ChainNameEnum.eth))) {
      approvalsTableName = 'approvals_new';
    } else {
      approvalsTableName = 'bsc_approvals';
    }

    const { address, page, limit, sortDirection, sortField } = getAllApprovalsQuery;
    const offset = limit * (page - 1);

    let addressesArray: string[] = [address];
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
          order by a.${sortField} ${sortDirection}
          offset ${offset} limit ${limit}
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
}
