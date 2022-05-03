import { parallelLimit } from 'async';
import { detailedDiff } from 'deep-object-diff';
import * as stringSimilarity from 'string-similarity';

import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { safeJsonParse } from '../../../utils';
import { Contract } from '../../database/entities/contract.entity';
import { ContractsAnalysisRepository } from '../../database/repositories/contracts.analysis.repo';
import { ContractsRepository } from '../../database/repositories/contracts.repo';
import { ProtocolsRepository } from '../../database/repositories/protocols.repo';
import { ANALYSE_CONTRACTS_PARALLEL_LIMIT } from '../protocols.constant';
import { AbiCompoundTemplate } from './abi/abi.compound.template';
import { AbiMasterchefTemplate } from './abi/abi.masterchef.template';
import { AbiFetcherService } from './abi/fetcher/abi.fetcher.service';

type ListSimilarData = {
  address: string;
  contractId: number;
  chain: string;
  protocolId?: number;
  protocol?: { name: string; url: string };
  abiCodeSimilarity: number;
  abiJsonDiff: any;
  abiJsonSimilarity: number;
};

type ListSimilarResults = {
  address: string;
  abiCodeSimilarity: number;
  abiJsonSimilarity: number;
  protocol: { name: string; url: string };
};

@Injectable()
export class ContractsAnalysisService {
  readonly abiTemplates: Map<number, any>;
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    @InjectRepository(ContractsRepository)
    private readonly contractsRepository: ContractsRepository,
    @InjectRepository(ContractsAnalysisRepository)
    private readonly contractAnalysisRepository: ContractsAnalysisRepository,
    @InjectRepository(ProtocolsRepository)
    private readonly protocolsRepository: ProtocolsRepository,
    private readonly abiFetcherService: AbiFetcherService,
  ) {
    this.abiTemplates = new Map<number, any>([
      [AbiMasterchefTemplate.id, AbiMasterchefTemplate],
      [AbiCompoundTemplate.id, AbiCompoundTemplate],
    ]);
  }

  async analyzeContractsAgainstTemplates(): Promise<void> {
    this.logger.log('analyzeContractsWithTemplates started');
    const templates = await this.contractsRepository.findTemplates();
    if (!templates.length) {
      this.logger.log('no templates found in DB, finishing..');
      return;
    }
    const contracts = await this.getContractsWithValidAbi();
    await parallelLimit(
      contracts.map((contract) => async () => {
        const parsedContractAbi = JSON.parse(contract.abi);
        for (const tContract of templates) {
          this.logger.debug(`analyse contracts: [${tContract.address}]-[${contract.address}]`);
          try {
            const abiCodeSimilarity = stringSimilarity.compareTwoStrings(
              tContract.abiCode,
              contract.abiCode,
            );
            const tContractAbi = JSON.parse(tContract.abi);
            const functionPredicates = this.getTemplateFunctionPredicates(tContract);
            const tAbi = this.extractAbiByPredicates(tContractAbi, functionPredicates);
            const abi = this.extractAbiByPredicates(parsedContractAbi, functionPredicates);
            const [abiJsonSimilarity, abiJsonDiff] = this.analyseAbiAgainstTemplate(tAbi, abi);
            await this.contractAnalysisRepository.upsertContractAnalysis(
              tContract,
              contract,
              abiCodeSimilarity,
              abiJsonSimilarity,
              abiJsonDiff,
            );
          } catch (e) {
            this.logger.warn(
              `analyseContracts error - [${contract.address}], [${tContract.address}]: ${e.stack}`,
            );
          }
        }
      }),
      ANALYSE_CONTRACTS_PARALLEL_LIMIT,
    );
    this.logger.log('analyzeContractsWithTemplates finished');
  }

  async analyseContracts(): Promise<void> {
    this.logger.log('analyseContracts started');
    const contracts = await this.getContractsWithValidAbi();
    await parallelLimit(
      contracts.map((contract) => async () => {
        const parsedContractAbi = JSON.parse(contract.abi);
        for (const counterpartContract of contracts) {
          if (contract.id === counterpartContract.id) continue;
          this.logger.debug(
            `analyse contracts: [${contract.address}]-[${counterpartContract.address}]`,
          );
          try {
            const { abiCodeSimilarity, abiJsonDiff, abiJsonSimilarity } =
              await this.analysAbiAndAbiCode(
                contract.abiCode,
                counterpartContract,
                parsedContractAbi,
              );

            await this.contractAnalysisRepository.upsertContractAnalysis(
              contract,
              counterpartContract,
              abiCodeSimilarity,
              abiJsonSimilarity,
              abiJsonDiff,
            );
          } catch (e) {
            this.logger.warn(
              `analyseContracts error - [${contract.address}], [${counterpartContract.address}]: ${e.stack}`,
            );
          }
        }
      }),
      ANALYSE_CONTRACTS_PARALLEL_LIMIT,
    );
    this.logger.log('analyseContracts finished');
  }

  private async analysAbiAndAbiCode(
    abiCode: string,
    counterpartContract: Contract,
    parsedContractAbi: any,
  ): Promise<{ abiCodeSimilarity: number; abiJsonSimilarity: number; abiJsonDiff: any }> {
    const abiCodeSimilarity = this.analyseAbiCode(abiCode, counterpartContract);
    const parsedCounterpartContractAbi = JSON.parse(counterpartContract.abi);
    const [abiJsonSimilarity, abiJsonDiff] = this.analyseAbi(
      parsedContractAbi,
      parsedCounterpartContractAbi,
    );
    return {
      abiCodeSimilarity,
      abiJsonSimilarity,
      abiJsonDiff,
    };
  }

  private analyseAbiCode(abiCode: string, counterpartContract: Contract): number {
    return stringSimilarity.compareTwoStrings(abiCode, counterpartContract.abiCode);
  }

  private async getContractsWithValidAbi() {
    return (await this.contractsRepository.findAllWithAbiAndAbiCode()).filter(({ abi }) =>
      safeJsonParse(abi),
    );
  }

  private analyseAbi(abi1, abi2): [number, object] {
    const abiJsonDiff = detailedDiff(abi1, abi2) as {
      added: object;
      deleted: object;
      updated: object;
    };
    const diffCount =
      this.count(abiJsonDiff.added) +
      this.count(abiJsonDiff.deleted) +
      this.count(abiJsonDiff.updated);
    const totalFieldsCount = this.count(abi1) + this.count(abi2);
    const abiJsonSimilarity = 1 - diffCount / totalFieldsCount;
    return [abiJsonSimilarity, abiJsonDiff];
  }

  private getTemplateFunctionPredicates(templateContract: Contract) {
    return this.abiTemplates.get(templateContract.id)?.functionPredicates;
  }

  private extractAbiByPredicates(abi: object[], functionPredicates: any) {
    if (!functionPredicates) {
      return abi;
    }
    return functionPredicates.map(({ predicate, modifier }) => {
      const foundItem = abi.find((item) => predicate(item)) || {};
      return modifier ? modifier(foundItem) : foundItem;
    });
  }

  private analyseAbiAgainstTemplate(tAbi, abi): [number, object] {
    const abiJsonDiff = detailedDiff(tAbi, abi) as {
      deleted: object;
      updated: object;
    };
    const diffCount = this.count(abiJsonDiff.deleted) + this.count(abiJsonDiff.updated);
    const totalFieldsCount = this.count(tAbi);
    const abiJsonSimilarity = 1 - diffCount / totalFieldsCount;
    return [abiJsonSimilarity, abiJsonDiff];
  }

  private count(o: object): number {
    return Object.keys(o).reduce(
      (r, k) => (o[k] && typeof o[k] === 'object' ? r + this.count(o[k]) : r + 1),
      0,
    );
  }

  async findSimilarAbiAndAbiCode(data: { contract: string }) {
    //checking exists contract in DB
    const contractInDb = await this.contractsRepository.findOne({ address: data.contract });
    if (contractInDb) {
      this.logger.log('Contract address already exists.');
      return;
    }

    const { abi, abiCode, chain } = await this.abiFetcherService.fetchAbiAndAbiCode(data.contract);
    try {
      const currentContract = await this.contractsRepository.save({
        address: data.contract,
        abi,
        abiCode,
        chain,
        Protocol: null,
      });

      const parsedContractAbi = JSON.parse(abi);

      const ListSimilarData: ListSimilarData[] = await parallelLimit(
        (
          await this.contractsRepository.findAllWithAbiAndAbiCode()
        )
          .filter(({ abi }) => safeJsonParse(abi))
          .map((counterpartContract) => async () => {
            const { abiCodeSimilarity, abiJsonDiff, abiJsonSimilarity } =
              await this.analysAbiAndAbiCode(abiCode, counterpartContract, parsedContractAbi);

            return {
              address: counterpartContract.address,
              contractId: counterpartContract.id,
              chain: counterpartContract.chain,
              protocolId: counterpartContract?.protocol?.id,
              abiCodeSimilarity,
              abiJsonDiff,
              abiJsonSimilarity,
            };
          }),
        ANALYSE_CONTRACTS_PARALLEL_LIMIT,
      );

      await this.contractAnalysisRepository.save(
        ListSimilarData.map((s) => ({
          contract: currentContract,
          counterpartContractId: s.contractId,
          abiCodeSimilarity: s.abiCodeSimilarity,
          abiJsonSimilarity: s.abiJsonSimilarity,
          abiJsonDiff: s.abiJsonDiff,
        })),
      );
      this.logger.log(`Completed similarity`);
    } catch (e) {
      this.logger.error(`Error for similarity contracts ${e}`);
    }
  }

  async getSimilarForContractAddress({
    contract,
    minSimilarityRate,
  }: {
    contract: string;
    minSimilarityRate: number;
  }): Promise<ListSimilarResults[]> {
    const contractInDb = await this.contractsRepository.findOne({ address: contract });
    if (!contractInDb) {
      return [];
    }
    const similarData = await this.contractAnalysisRepository.findWithJoinContract(contractInDb.id);

    const filtredList = similarData.filter(
      ({ abicodesimilarity, abijsonsimilarity }) =>
        abicodesimilarity >= minSimilarityRate || abijsonsimilarity >= minSimilarityRate,
    );

    return filtredList
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
      .sort((a, b) => {
        if (a.abiCodeSimilarity > b.abiCodeSimilarity) return -1;
        else if (a.abiCodeSimilarity < b.abiCodeSimilarity) return 1;
        return 0;
      });
  }
}
