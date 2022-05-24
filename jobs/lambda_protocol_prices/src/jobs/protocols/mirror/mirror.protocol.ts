import { LCDClient } from '@terra-money/terra.js';

import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { AbsoluteChainIdEnum, Address, ChainIdEnum, Logger } from '@app/common';

import { AccountService } from '../../../microservices/account.service';
import { PriceService } from '../../../microservices/price.service';
import { ProtocolBase } from '../protocol.base';

@Injectable()
export class MirrorProtocol extends ProtocolBase {
  chains = [ChainIdEnum.terra];
  job = `Mirror_TokenPriceUpdate`;
  private mirrorCollateralOracle = 'terra1pmlh0j5gpzh2wsmyd3cuk39cgh2gfwk6h5wy9j';

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    protected readonly configService: ConfigService,
    protected readonly accountService: AccountService,
    protected readonly priceService: PriceService,
  ) {
    super();
    this.chain = Number(configService.get('CHAIN_ID'));
  }

  async update() {
    const timeKey = `Protocol Prices - Mirror`;
    try {
      this.logger.time(timeKey);
      const provider = new LCDClient({
        URL: this.configService.get<string>('RPC_URL'),
        chainID: `${AbsoluteChainIdEnum.terra}`,
      });

      const { collaterals } = await provider.wasm.contractQuery(this.mirrorCollateralOracle, {
        // eslint-disable-next-line camelcase
        collateral_asset_infos: {},
      });

      const savedTokenResults = await this.saveAssets(
        collaterals.filter((col) => !col.is_revoked).map((col) => col.asset),
        false, // set to true and run manually to force re-index all underlying assets and mark parents as not tracked
      );

      const tokens = savedTokenResults.flatMap((tokenResult) => {
        if (tokenResult.status !== 'fulfilled') return [];
        return tokenResult.value.address;
      });

      const { prices } = await this.fetchPrices(tokens);
      const missingPriceTokens = tokens.filter((token) => !prices[token]);
      const response = await this.fetchMirrorCollateralsPrices(missingPriceTokens, provider);
      const resultArray = response
        .map((tokenResult) => {
          if (tokenResult.status === 'fulfilled') {
            const { asset, rate } = tokenResult.value as { asset; rate };
            return this.formatPriceRequest(asset, Number(rate));
          }
        })
        .filter((result) => result);

      this.logger.timeEnd(timeKey);

      return resultArray;
    } catch (e) {
      this.logger.error('Failed to update Mirror specific token prices');
      this.logger.error(e);
      return [];
    }
  }

  async fetchMirrorCollateralsPrices(tokenAddresses: Address[], provider: LCDClient) {
    return await Promise.allSettled(
      tokenAddresses.map((address) =>
        provider.wasm.contractQuery(this.mirrorCollateralOracle, {
          // eslint-disable-next-line camelcase
          collateral_price: {
            asset: address,
          },
        }),
      ),
    );
  }
}
