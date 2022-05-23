import { EntityRepository, Repository } from 'typeorm';

import { Contract } from '../entities/contract.entity';
import { ContractsAnalysis } from '../entities/contracts.analysis.entity';

type SimilarWithProtocolData = {
  abiCodeSimilarity: number;
  abiJsonSimilarity: number;
  address: string;
  protocolName: string;
  protocolUrl: string;
  tvl: string;
  metadata?: object;
};

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

  async findSimilar(id: number, minRate: number): Promise<SimilarWithProtocolData[]> {
    const query = `
      SELECT
        ca.abi_code_similarity "abiCodeSimilarity",
        ca.abi_json_similarity "abiJsonSimilarity",
        ca.metadata,
        c2.address,
        p2.name "protocolName",
        p2.url "protocolUrl",
        pp2.value tvl
      FROM contracts_analysis ca
          left join contracts c1 on ca.contract_id = c1.id
          left join contracts c2 on ca.counterpart_contract_id = c2.id
          left join protocols p2 on c2.protocol_id = p2.id
          left join protocols_properties pp2 on p2.id = pp2.protocol_id and pp2.name = 'TVL'
      WHERE ca.contract_id = $1
          AND (ca.abi_json_similarity >= $2 OR ca.abi_code_similarity >= $3);
    `;
    return this.query(query, [id, minRate, minRate]);
  }

  async upsertContractAnalysis(
    contract: Contract,
    counterpartContract: Contract,
    abiCodeSimilarity: number,
    abiJsonSimilarity: number,
    metadata?: object,
  ) {
    return this.upsert(
      {
        counterpartContractId: counterpartContract.id,
        contract,
        abiCodeSimilarity,
        abiJsonSimilarity,
        metadata,
      },
      {
        conflictPaths: ['counterpartContractId', 'contract'],
        skipUpdateIfNoValuesChanged: true,
      },
    );
  }
}
