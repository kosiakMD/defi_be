import {
  Address,
  ChainAbbrEnum,
  ChainDto,
  IntegrationFeaturesDataDto,
  Logger,
  ProjectEnum,
  ProtocolName,
} from '@app/common';

import { AccountService } from '../../account/account.service';
import { PriceService } from '../../price/price.service';
import { ProtocolFeaturesInfo } from '../protocol.types';
import { DefaultDataProvider, RawFeaturesDto } from '../protocols.dto';
import { BasicProtocol } from './basicProtocol';
import { Mapper } from './mappers/mapper';

export abstract class DataProviderProtocol extends BasicProtocol {
  abstract readonly chains: ChainAbbrEnum[];
  abstract readonly project: ProjectEnum;
  abstract readonly name: ProtocolName;
  abstract readonly displayName: string;
  abstract readonly features: ProtocolFeaturesInfo;
  protected abstract readonly logger: Logger;
  protected abstract readonly accountService: AccountService;
  protected abstract readonly priceService: PriceService;
  protected abstract readonly dataProvider: DefaultDataProvider;
  public readonly feeRate?: number;
  protected readonly mapper?: Mapper;

  protected constructor() {
    super();
  }

  public getAllFeaturesData?(
    address: Address,
    chain: ChainDto,
  ): Promise<IntegrationFeaturesDataDto>;

  public getAllFeaturesRawData = async (
    addresses: Address,
    chain: ChainDto,
  ): Promise<RawFeaturesDto> => {
    try {
      const data = await this.getData(addresses, chain);

      const rawPools = data.find((data) => data['liquidityPositions'])?.liquidityPositions;
      const rawStaking = data.find((data) => data['stakingPositions'])?.stakingPositions;
      const rawLending = data.find((data) => data['lendingPositions']);
      const rawBorrowing = data.find((data) => data['borrowingPositions']);
      const rawLeverageFarming = data.find(
        (data) => data['leverageFarmingPositions'],
      )?.leverageFarmingPositions;

      return { rawPools, rawStaking, rawLending, rawBorrowing, rawLeverageFarming };
    } catch (e) {
      this.logger.error(e);
      throw e;
    }
  };

  // get data from data providers

  protected async getData(addresses: Address, chain: ChainDto) {
    return await this.dataProvider.getDataByAddresses(addresses, chain.id);
  }
}

export default DataProviderProtocol;
