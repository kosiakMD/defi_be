import { Injectable } from '@nestjs/common';
import { getManager } from 'typeorm';

import { Address, ContractApproval } from '../../interfaces';
import bscApprovals from '../../models/queries/GET_BSC_APPROVAL_QUERY';
import ethApprovals from '../../models/queries/GET_ETH_APPROVAL_QUERY';
import ApprovalMapper from '../utils/approvalMapper';

@Injectable()
export class ApprovalsService {
  async getEthApprovals(address: Address): Promise<ContractApproval[]> {
    try {
      const entityManager = getManager();
      const approvals: any[] = await entityManager.query(ethApprovals(), [address]);
      return ApprovalMapper(approvals);
    } catch (e) {
      throw Error(e);
    }
  }

  async getBscApprovals(address: Address): Promise<ContractApproval[]> {
    try {
      const entityManager = getManager();
      const approvals: any[] = await entityManager.query(bscApprovals(), [address]);
      return ApprovalMapper(approvals);
    } catch (e) {
      throw Error(e);
    }
  }
}
