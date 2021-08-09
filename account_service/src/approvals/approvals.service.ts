import { getManager } from 'typeorm';

import { Injectable } from '@nestjs/common';

import ApprovalMapper from './utils/approvalMapper';
import { CHAIN_ID_ETH } from 'src/common/constatnt';
import { ChainIdEnum } from 'src/common/enum';
import { Address, ContractApprovalResponse } from 'src/common/interfaces';

@Injectable()
export class ApprovalsService {
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
      approvalsTableName = 'approvals';
    } else {
      approvalsTableName = 'bsc_approvals';
    }

    const addressesArray: string[] = addresses.split(',');
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
          from approvals a
                   left join projects_contract pc on a.contract_address = pc.address
                   left join projects_info pi on pc.project_id = pi.id
                   left join assets_new an on a.asset_id = an.id and an.chain_id = 1
          where a.id in (
              select
                  MAX(a.id)
              from ${approvalsTableName} a
              where a.user_address in (${addressesJoined})
              group by a.user_address, a.token_address, a.contract_address
            )`);
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
