import parallelLimit from 'async/parallelLimit';

import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { toChunkedArray } from '@app/common/utils/transform';

import { Contract } from '../../database/entities/contract.entity';
import { Link } from '../../database/entities/link.entity';
import { ProtocolChain } from '../../database/entities/protocol.chain.entity';
import { ContractsRepository } from '../../database/repositories/contracts.repo';
import { ProtocolsRepository } from '../../database/repositories/protocols.repo';
import { IParsingReturned } from '../interfaces/protocol.interface';
import { FETCH_ABI_PARALLEL_LIMIT, NUMBER_ITEMS_CHUNK } from '../protocols.constant';
import { GeneralPageParsing } from '../strategies/contract';
import { AbiFetcherService } from './abi/fetcher/abi.fetcher.service';

@Injectable()
export class ContractsService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    @InjectRepository(ProtocolsRepository) private readonly protocolsRepo: ProtocolsRepository,
    @InjectRepository(ContractsRepository)
    private readonly contractsRepository: ContractsRepository,
    private readonly generalParsingPage: GeneralPageParsing,
    private readonly abiFetcherService: AbiFetcherService,
  ) {}

  async run(list: Link[], chainProtocolList: Map<string, ProtocolChain>) {
    const chunks = toChunkedArray(
      list.filter((l) => (l.type === 'docs' ? l : '')),
      NUMBER_ITEMS_CHUNK,
    );

    const execute = [];
    const executedList = [];
    for (const chunk of chunks) {
      for (const c of chunk) {
        execute.push(this.generalParsingPage.parsing({ link: c }));
      }
      executedList.push(...(await Promise.allSettled(execute)));
    }

    const filteredList = [];
    for (const { status, value } of executedList) {
      if (status === 'fulfilled') {
        filteredList.push(...value);
      }
    }

    this.logger.log('Аunction of checking addresses of contracts has launched');
    const listSaveData = await this.checkContractAddresses(filteredList, chainProtocolList);

    const listFound = await this.contractsRepository.find({
      where: listSaveData.map((d) => ({
        address: d.address,
        protocolsChainsId: d.protocolsChainsId,
      })),
    });

    const sortedByAddress = new Map(listFound.map((f) => [f.address, f]));

    const filteredSaveData = listSaveData.filter((lsd) =>
      !sortedByAddress.has(lsd.address) ? lsd : '',
    );
    this.contractsRepository.save(filteredSaveData);
    this.logger.log(`${filteredSaveData} contracts were saved!`);
  }

  async checkContractAddresses(
    listAddresses: IParsingReturned[],
    chainProtocolList: Map<string, ProtocolChain>,
  ): Promise<Contract[]> {
    const listSaveData = [];
    for (const value of listAddresses) {
      const { abi, abiCode } = await this.abiFetcherService.fetchAbiAndAbiCode(value.contract);
      if (abi && abiCode) {
        listSaveData.push({
          abi: abi,
          abiCode: abiCode,
          address: value.contract,
          protocolsChainsId: chainProtocolList.get(value.extras.protocol.url).id,
        });
        this.logger.log(
          `${value.contract} - 
          ${chainProtocolList.get(value.extras.protocol.url).chain.name} - 
          ${chainProtocolList.get(value.extras.protocol.url).protocol.url} is checked!`,
        );
      }
    }
    return listSaveData;
  }

  async fetchAbiAndAbiCode() {
    const contracts = await this.contractsRepository.findWithoutAbiOrAbiCode();
    await parallelLimit(
      contracts.map(({ id, address }) => async () => {
        //fetch ABI and ABI Code
        const { abi, abiCode } = await this.abiFetcherService.fetchAbiAndAbiCode(address);

        //update DB info
        await this.contractsRepository.update({ id }, { abi, abiCode });
      }),
      FETCH_ABI_PARALLEL_LIMIT,
    );
  }
}
