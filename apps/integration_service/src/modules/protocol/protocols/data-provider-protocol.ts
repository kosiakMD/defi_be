import { ChainDto, IntegrationFeaturesDataDto } from '@app/common/dto';
import { ChainAbbrEnum, ProjectEnum } from '@app/common/enum';
import { Logger } from '@app/common/logger';
import { Address, ProtocolName } from '@app/common/types';

import { ProtocolFeaturesInfo } from '../../../common/types/protocol.types';

import { AccountService } from '../../microservice/account.service';
import { PriceService } from '../../microservice/price.service';
import { DefaultDataProvider, RawFeaturesDto } from '../dto/protocols.dto';
import { Mapper } from '../helpers/mappers/mapper';
import { BasicProtocol } from './basic-protocol';

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
      const rawStaking = data.reduce((previous, current) => {
        current['stakingPositions'] && previous.push(...current['stakingPositions']);
        return previous;
      }, []);
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
    return await this.dataProvider.getDataByAddresses(addresses, chain);
  }
}

export default DataProviderProtocol;
