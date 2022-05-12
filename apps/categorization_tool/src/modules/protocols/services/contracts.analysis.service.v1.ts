import { eachLimit, doWhilst } from 'async';
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

@Injectable()
export class ContractsAnalysisServiceV1 {
  readonly contractsFetchLimit = 50;
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
    for (const tContract of templates) {
      await this.analyseContract(tContract, this.processTemplateContractAnalysis.bind(this));
    }
    this.logger.log('analyzeContractsWithTemplates finished');
  }

  async analyseContracts(): Promise<void> {
    this.logger.log('analyseContracts started');
    let skip = 0;
    await doWhilst(
      async () => this.getContractsWithValidAbi(skip),
      async ({ taken, contracts }) => {
        await eachLimit(
          contracts,
          ANALYSE_CONTRACTS_PARALLEL_LIMIT,
          this.analyseContract.bind(this),
        );
        skip += taken;
        this.logger.debug(`analysed [${skip}] contracts`);
        return !!contracts.length;
      },
    );
    this.logger.log('analyseContracts finished');
  }

  async findSimilarAbiAndAbiCode(data: { contract: string }) {
    const address = data.contract;
    this.logger.log(`findSimilarAbiAndAbiCode started: ${address}`);
    //try to find contract in DB
    let contract = await this.contractsRepository.findByAddress(address);
    if (!contract) {
      //fetch contract ABI and ABI Code to save into DB
      const { abi, abiCode, chain } = await this.abiFetcherService.fetchAbiAndAbiCode(address);
      contract = await this.contractsRepository.save({ address, abi, abiCode, chain });
    }
    if (!safeJsonParse(contract.abi)) {
      this.logger.warn(`there is invalid ABI for contract: [${data.contract}]`);
      //aborting - we don't have valid ABI to compare
      return;
    }
    await this.analyseContract(contract);
    this.logger.log(`findSimilarAbiAndAbiCode finished: ${data.contract}`);
  }

  private async analyseContract(
    contract: Contract,
    processor = this.processContractAnalysis.bind(this),
  ): Promise<void> {
    this.logger.debug(`analysing contract: [${contract.address}]`);
    let skip = 0;
    await doWhilst(
      async () => this.getContractsWithValidAbi(skip),
      async ({ taken, contracts }) => {
        await processor(contract, contracts);
        skip += taken;
        return !!contracts.length;
      },
    );
  }

  private async processTemplateContractAnalysis(
    tContract: Contract,
    contracts: Contract[],
  ): Promise<void> {
    const tContractAbi = JSON.parse(tContract.abi);
    for (const contract of contracts) {
      try {
        const abiCodeSimilarity = stringSimilarity.compareTwoStrings(
          tContract.abiCode,
          contract.abiCode,
        );
        const parsedContractAbi = JSON.parse(contract.abi);
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

  private async processContractAnalysis(contract: Contract, contracts: Contract[]): Promise<void> {
    const parsedContractAbi = JSON.parse(contract.abi);
    for (const counterpartContract of contracts) {
      if (contract.id === counterpartContract.id) continue;
      try {
        const { abiCodeSimilarity, abiJsonDiff, abiJsonSimilarity } =
          await this.analyseAbiAndAbiCode(contract.abiCode, counterpartContract, parsedContractAbi);

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
  }

  private async analyseAbiAndAbiCode(
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

  private async getContractsWithValidAbi(
    skip?: number,
    take = this.contractsFetchLimit,
  ): Promise<{ taken: number; contracts: Contract[] }> {
    const fetchedContracts = await this.contractsRepository.findAllWithAbiAndAbiCode(skip, take);
    return {
      taken: fetchedContracts.length,
      contracts: fetchedContracts.filter(({ abi }) => safeJsonParse(abi)),
    };
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

  private count(o: object): number {
    return Object.keys(o).reduce(
      (r, k) => (o[k] && typeof o[k] === 'object' ? r + this.count(o[k]) : r + 1),
      0,
    );
  }
}
