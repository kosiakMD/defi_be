import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ContractsAnalysisRepository } from '../../database/repositories/contracts.analysis.repo';
import { ContractsRepository } from '../../database/repositories/contracts.repo';
import { ProtocolsRepository } from '../../database/repositories/protocols.repo';

type ListSimilarResults = {
  address: string;
  abiCodeSimilarity: number;
  abiJsonSimilarity: number;
  protocol: { name: string; url: string };
};

@Injectable()
export class ContractsAnalysisService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    @InjectRepository(ContractsRepository)
    private readonly contractsRepository: ContractsRepository,
    @InjectRepository(ContractsAnalysisRepository)
    private readonly contractAnalysisRepository: ContractsAnalysisRepository,
    @InjectRepository(ProtocolsRepository)
    private readonly protocolsRepository: ProtocolsRepository,
  ) {}

  async getSimilarForContractAddress({
    contract,
    minSimilarityRate,
  }: {
    contract: string;
    minSimilarityRate: number;
  }): Promise<ListSimilarResults[]> {
    const contractInDb = await this.contractsRepository.findByAddressCaseInsensitive(contract);
    if (!contractInDb) {
      return [];
    }
    const similarData = await this.contractAnalysisRepository.findWithJoinContract(
      contractInDb.id,
      minSimilarityRate,
    );

    return similarData
      .map((f) => ({
        address: f.address,
        abiCodeSimilarity: f.abicodesimilarity,
        abiJsonSimilarity: f.abijsonsimilarity,
        protocol: {
          name: f.nameprotocol,
          url: f.urlprotocol,
          TVL: f.tvl,
        },
      }))
      .sort((a, b) => b.abiCodeSimilarity - a.abiCodeSimilarity); //DESC by abiCodeSimilarity
  }
}
