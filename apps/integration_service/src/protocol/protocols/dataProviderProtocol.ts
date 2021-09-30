import {
  Address,
  ChainAbbrEnum,
  ChainIdEnum,
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
    chainId: ChainIdEnum,
  ): Promise<IntegrationFeaturesDataDto>;

  public getAllFeaturesRawData = async (
    addresses: Address,
    chainId: ChainIdEnum,
  ): Promise<RawFeaturesDto> => {
    try {
      const data = await this.getData(addresses, chainId);

      const rawPools = data.find((data) => data['liquidityPositions'])?.liquidityPositions;
      const rawStaking = data.find((data) => data['stakingPositions'])?.stakingPositions;
      const rawLending = data.find((data) => data['lendingPositions']);
      const rawBorrowing = data.find((data) => data['borrowingPositions']);

      return { rawPools, rawStaking, rawLending, rawBorrowing };
    } catch (e) {
      this.logger.error(e);
      throw e;
    }
  };

  // get data from data providers

  protected async getData(addresses, chainId) {
    return await this.dataProvider.getDataByAddresses(addresses, chainId);
  }
}

export default DataProviderProtocol;
