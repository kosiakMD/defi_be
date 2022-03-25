import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Address, ChainIdEnum, CurrentPricesPayload, Logger } from '@app/common';

import { AccountService } from '../../../microservices/account.service';
import { PriceService } from '../../../microservices/price.service';
import { IAaveGenericToken } from '../../../thegraph/aave/interfaces';
import { AaveSubgraph } from '../../../thegraph/aave/subgraph';
import { IProtocolPriceUpdate } from '../../interfaces/protocol.price.update';
import { ProtocolBase } from '../protocol.base';
import { ADDITIONAL_TOKENS } from './tokens';

@Injectable()
export class AaveProtocol extends ProtocolBase implements IProtocolPriceUpdate {
  chains = [ChainIdEnum.eth]; // TODO: polygon & avax
  job = `Aave_TokenPriceUpdate`;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    protected readonly configService: ConfigService,
    protected readonly accountService: AccountService,
    protected readonly priceService: PriceService,
    private readonly subgraph: AaveSubgraph,
  ) {
    super();
    this.chain = Number(configService.get('CHAIN_ID'));
  }

  async update() {
    const timeKey = `Protocol Prices - Aave.com`;
    try {
      this.logger.time(timeKey);

      const additional = ADDITIONAL_TOKENS[this.chain] ?? [];
      const { atokens } = await this.subgraph.getTokens();

      const savedTokenResults = await this.saveAssets(
        atokens.map((a) => a.id),
        false, // set to true and run manually to force re-index all underlying assets and mark parents as not tracked
      );

      const tokens = savedTokenResults
        .flatMap((tokenResult) => {
          if (tokenResult.status !== 'fulfilled' || !tokenResult.value.underlyingAssets) return [];
          return {
            id: tokenResult.value.address,
            underlyingAssetAddress: tokenResult.value.underlyingAssets.find(
              (underlying) => underlying.address,
            ).address,
          };
        })
        .concat(additional);

      const underlying = this.getUniqueUnderlyingTokenArray(tokens);

      const { prices } = await this.fetchPrices(underlying);

      const results = tokens.reduce(this.reduceTokensToResults(prices), []);

      this.logger.timeEnd(timeKey);

      return results;
    } catch (e: any) {
      this.logger.error('Failed to update aave.com specific token prices');
      this.logger.error(e);
      return [];
    }
  }

  reduceTokensToResults(prices: CurrentPricesPayload) {
    return (accumulator, token) => {
      if (!prices[token.underlyingAssetAddress]) {
        // Unsupported Token
        return accumulator;
      }

      accumulator.push(
        this.formatPriceRequest(token.id, Number(prices[token.underlyingAssetAddress])),
      );

      return accumulator;
    };
  }

  getUniqueUnderlyingTokenArray(tokens: IAaveGenericToken[]): Address[] {
    return Array.from(
      new Set(tokens.map((token: IAaveGenericToken) => token.underlyingAssetAddress)),
    );
  }
}
