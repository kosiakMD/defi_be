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
import { AbiFetcherBscscan } from './abi.fetcher.bscscan';
import { AbiFetcherDummy } from './abi.fetcher.dummy';
import { AbiFetcherEtherscan } from './abi.fetcher.etherscan';
import { IAbiFetcher } from './abi.fetcher.interface';

@Injectable()
export class ContractsService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    @InjectRepository(ProtocolsRepository) private readonly protocolsRepo: ProtocolsRepository,
    @InjectRepository(ContractsRepository)
    private readonly contractsRepository: ContractsRepository,
    private readonly generalParsingPage: GeneralPageParsing,
    private readonly abiFetcherEtherscan: AbiFetcherEtherscan,
    private readonly abiFetcherBscscan: AbiFetcherBscscan,
    private readonly abiFetcherDummy: AbiFetcherDummy,
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
      const t = await this.fetchAbiAndAbiCodeOne(
        value.contract,
        chainProtocolList.get(value.extras.protocol.url).chain.name,
      );
      if (t.abi && t.abiCode) {
        listSaveData.push({
          abi: t.abi,
          abiCode: t.abi,
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

  async fetchAbiAndAbiCodeOne(contract: string, chainName: string) {
    //resolve fetcher by chain
    const abiFetcher = this.resolveAbiFetcherByChain(chainName);
    //fetch ABI and ABI Code
    return abiFetcher.fetchAbiAndAbiCode(contract);
  }

  async fetchAbiAndAbiCode() {
    const contracts = await this.contractsRepository.findWithoutAbiOrAbiCode();
    await parallelLimit(
      contracts.map(({ id, address, protocolChain }) => async () => {
        //fetch ABI and ABI Code
        const { abi, abiCode } = await this.fetchAbiAndAbiCodeOne(
          address,
          protocolChain.chain.name,
        );

        //update DB info
        await this.contractsRepository.update({ id }, { abi, abiCode });
      }),
      FETCH_ABI_PARALLEL_LIMIT,
    );
  }

  //TODO: think how to avoid using name of the chain here
  // perhaps add abi_provider to Chain entity and DB
  // also all the code and logic related to ABI should be extracted into separate service, e.g. AbiService
  resolveAbiFetcherByChain(chain: string): IAbiFetcher {
    switch (chain.toLowerCase()) {
      case 'ethereum':
        return this.abiFetcherEtherscan;
      case 'bsc':
        return this.abiFetcherBscscan;
      default:
        //unimplemented fetcher for the provided chain
        return this.abiFetcherDummy;
    }
  }
}
