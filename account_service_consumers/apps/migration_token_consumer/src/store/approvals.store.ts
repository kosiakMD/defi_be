import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ApprovalsEntity } from './entities/approvals.entity';
import { ApprovalsRepository } from './repositories/approvals.repository';

@Injectable()
export class ApprovalsStore {

  constructor(
    @InjectRepository(ApprovalsEntity) private readonly repository: ApprovalsRepository,
  ) {
  }

  async save(approval: ApprovalsEntity) {
    const insertRegularApproval = `
      insert into approvals (
                                         user_address, 
                                         token_address, 
                                         contract_address, 
                                         amount, 
                                         block_number, 
                                         block_timestamp, 
                                         hash, 
                                         asset_id
                              ) values (
                                        '${approval.userAddress}',
                                        '${approval.tokenAddress}',
                                        '${approval.contractAddress}',
                                        '${approval.amount}',
                                        ${approval.blockNumber},
                                        ${approval.blockTimestamp},
                                        '${approval.hash}',
                                        ${approval.assetId}
                                       )
    `;
    // save as usual to have current data updated
    await this.repository.query(insertRegularApproval);

    // save as unique approval in order to switch to this table in the near future
    const insertUniqueApproval = `
      insert into approvals_new (
                                         user_address, 
                                         token_address, 
                                         contract_address, 
                                         amount, 
                                         block_number, 
                                         block_timestamp, 
                                         hash, 
                                         asset_id
                              ) values (
                                        '${approval.userAddress}',
                                        '${approval.tokenAddress}',
                                        '${approval.contractAddress}',
                                        '${approval.amount}',
                                        ${approval.blockNumber},
                                        ${approval.blockTimestamp},
                                        '${approval.hash}',
                                        ${approval.assetId}
                                       )
                              on conflict (user_address, asset_id, contract_address)
                              do update
                              set block_number    = case
                                                        when excluded.block_timestamp > approvals_new.block_timestamp
                                                            then excluded.block_number
                                                        else approvals_new.block_number
                                  end,
                                  block_timestamp = case
                                                        when excluded.block_timestamp > approvals_new.block_timestamp
                                                            then excluded.block_timestamp
                                                        else approvals_new.block_timestamp
                                      end,
                                  hash            = case
                                                        when excluded.block_timestamp > approvals_new.block_timestamp
                                                            then excluded.hash
                                                        else approvals_new.hash
                                      end,
                                  amount          = case
                                                        when excluded.block_timestamp > approvals_new.block_timestamp
                                                            then excluded.amount
                                                        else approvals_new.amount
                                      end;
    `;
    await this.repository.query(insertUniqueApproval);
  }
}
