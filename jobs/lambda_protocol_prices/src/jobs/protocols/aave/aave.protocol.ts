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
      const tokens = atokens.concat(additional);

      const underlying = this.getUniqueUnderlyingTokenArray(tokens);

      const { prices } = await this.fetchPrices(underlying);

      const results = tokens.reduce(this.reduceTokensToResults(prices), []);

      this.logger.timeEnd(timeKey);

      return results;
    } catch (e) {
      this.logger.error('Failed to update aave.com specific token prices');
      this.logger.error(e);
      return [];
    }
  }

  reduceTokensToResults(prices: CurrentPricesPayload) {
    return (accumulator, token) => {
      // Aave subgraph has a bug where it returns variable debt bearing tokens in the atokens result
      // with the underlying asset being set to '0x00'. We do not want to price these tokens currently
      if (token.underlyingAssetAddress === '0x00') {
        return accumulator;
      }

      if (!prices[token.underlyingAssetAddress]) {
        this.logger.warn(
          `[Aave Pricing] Failed to fetch prices for token ${token.id} - (underlying: ${token.underlyingAssetAddress})`,
        );
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
