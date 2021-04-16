import { Injectable } from '@nestjs/common';
import { getManager } from 'typeorm';

import { Address, ContractApprovalResponse } from '../interfaces';
import { CHAIN_ID_BSC, CHAIN_ID_ETH } from '../utils/utils';
import ApprovalMapper from './utils/approvalMapper';

@Injectable()
export class ApprovalsService {
  async getAllApprovals(addresses: Address): Promise<ContractApprovalResponse> {
    const allApprovals = {};
    if (!addresses) {
      return allApprovals;
    }

    const [ethApprovals, bscApprovals] = await Promise.all([
      this.getApprovals(addresses, CHAIN_ID_ETH),
      this.getApprovals(addresses, CHAIN_ID_BSC),
    ]);

    Object.keys(ethApprovals).map((key) => {
      allApprovals[key] = [...ethApprovals[key], ...bscApprovals[key]];
    });

    return allApprovals;
  }

  async getApprovals(addresses: Address, chainId: number): Promise<ContractApprovalResponse> {
    let approvalsTableName, approvalsTokensTableName;
    if (chainId == 1) {
      approvalsTableName = 'approvals';
      approvalsTokensTableName = 'approvals_tokens';
    } else {
      approvalsTableName = 'bsc_approvals';
      approvalsTokensTableName = 'bsc_approvals_tokens';
    }

    const addressesArray: string[] = addresses.split(',');
    const addressesJoined: string = addressesArray.map((a) => `'${a}'`).join(',');
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
               pt.img_path as token_icon,
               pt.name as token_name,
               pt.symbol as token_symbol,
               pt.decimals as token_decimal
            from ${approvalsTableName} a
              left join projects_contract pc on a.contract_address = pc.address
              left join projects_info pi on pc.project_id = pi.id
              left join ${approvalsTokensTableName} pt on a.token_address = pt.address
            where a.id in (
              select
                MAX(a.id)
              from ${approvalsTableName} a
              where user_address in (${addressesJoined})
              group by a.token_address, a.contract_address
            )`);

    return addressesArray.reduce((response, address) => {
      const singleAddressApprovals = approvals.filter(
        (approval) => approval['user_address'] == address,
      );
      return {
        ...response,
        [address]: ApprovalMapper(singleAddressApprovals, chainId),
      };
    }, {});
  }
}
