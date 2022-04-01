import { EntityRepository, Repository } from 'typeorm';

import { Contract } from '../entities/contract.entity';
import { ContractsAnalysis } from '../entities/contracts.analysis.entity';

@EntityRepository(ContractsAnalysis)
export class ContractsAnalysisRepository extends Repository<ContractsAnalysis> {
  async findOneByContractIdAndCounterpartContractId(
    contractId: number,
    counterpartContractId: number,
  ): Promise<ContractsAnalysis> {
    const query = `
        SELECT ca.*
        FROM contracts_analysis ca
        WHERE ca.contract_id = $1
          AND ca.counterpart_contract_id = $2
        LIMIT 1
    `;
    return (await this.query(query, [contractId, counterpartContractId]))[0];
  }

  async upsertContractAnalysis(
    contract: Contract,
    counterpartContract: Contract,
    similarity: number,
  ) {
    const cId = contract.id;
    const ccId = counterpartContract.id;
    const analysis = await this.findOneByContractIdAndCounterpartContractId(cId, ccId);
    return analysis
      ? this.update({ id: analysis.id }, { similarity })
      : this.save({ contract, counterpartContractId: ccId, similarity });
  }
}
