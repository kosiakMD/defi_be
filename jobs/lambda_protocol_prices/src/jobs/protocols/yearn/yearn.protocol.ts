import { IYearnVaults } from 'jobs/lambda_protocol_prices/src/thegraph/yearn/interfaces';

import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Address, ChainIdEnum, Logger } from '@app/common';
import { normalizeDecimals } from '@app/common/utils/number';

import { MulticallService } from '../../../chain/multicall.service';
import { AccountService } from '../../../microservices/account.service';
import { PriceService } from '../../../microservices/price.service';
import { YearnSubgraph } from '../../../thegraph/yearn/subgraph';
import { IProtocolPriceUpdate } from '../../interfaces/protocol.price.update';
import { ProtocolBase } from '../protocol.base';
import { ShareTokenAbi } from './abis/ShareTokenAbi';
import { ADDITIONAL_VAULTS } from './constants';

@Injectable()
export class YearnProtocol extends ProtocolBase implements IProtocolPriceUpdate {
  chains = [ChainIdEnum.eth]; // TODO: Fantom
  job = `Yearn_TokenPriceUpdate`;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    protected readonly configService: ConfigService,
    protected readonly accountService: AccountService,
    protected readonly priceService: PriceService,
    protected readonly multicallService: MulticallService,
    private readonly subgraph: YearnSubgraph,
  ) {
    super();
    this.chain = Number(configService.get('CHAIN_ID'));
  }

  async update() {
    const timeKey = `Protocol Prices - Yearn.finance`;
    try {
      this.logger.time(timeKey);

      const [{ vaults: subgraphVaults }, onChainVaults] = await Promise.all([
        this.subgraph.getVaults(),
        this.getAdditionalVaults(),
      ]);

      const vaults = subgraphVaults.concat(onChainVaults);

      const shareTokens = Array.from(new Set(vaults.map((vault) => vault.shareToken.id)));

      const sharePrices = await this.getVaultsPricePerShare(shareTokens);

      const underlyingTokens = Array.from(new Set(vaults.map((vault) => vault.token.id)));

      const { prices } = await this.fetchPrices(underlyingTokens);

      const newUnderlying = vaults.filter((vault) => !prices[vault.token.id]);

      if (newUnderlying.length) {
        await this.saveAssets(newUnderlying.map((a) => a.token.id));
      }

      const response = vaults.reduce((acc, vault) => {
        if (!prices[vault.token.id]) {
          this.logger.warn(
            `[Yearn Pricing] Failed to fetch prices for token ${vault.shareToken.id} - (underlying: ${vault.token.id})`,
          );
          return acc;
        }
        const price =
          normalizeDecimals(sharePrices.get(vault.shareToken.id), vault.shareToken.decimals) *
          Number(prices[vault.token.id]);

        acc.push(this.formatPriceRequest(vault.shareToken.id, price));
        return acc;
      }, []);

      this.logger.timeEnd(timeKey);

      return response;
    } catch (e) {
      this.logger.error('Failed to update yearn.finance prices');
      this.logger.error(e);
      return [];
    }
  }

  async getAdditionalVaults(): Promise<IYearnVaults[]> {
    const calls = new Map();
    ADDITIONAL_VAULTS[this.chain]?.forEach((vaultAddress) => {
      const contract = new ShareTokenAbi(vaultAddress);
      calls.set(`${vaultAddress}-token`, contract.token());
      calls.set(`${vaultAddress}-decimals`, contract.decimals());
    });
    const vaultResults = await this.multicallService.handleInBatches(calls);
    const underlyingAddresses = ADDITIONAL_VAULTS[this.chain]?.map((vaultAddress) => {
      return vaultResults.get(`${vaultAddress}-token`).output.data.toString().toLowerCase();
    });
    const underlying = await this.fetchAssets(Array.from(new Set(underlyingAddresses)));
    const underlyingMap = new Map(underlying.map((a) => [a.address, a]));

    return ADDITIONAL_VAULTS[this.chain]?.map((vaultAddress) => {
      const tokenAddress = vaultResults
        .get(`${vaultAddress}-token`)
        .output.data.toString()
        .toLowerCase();

      return {
        shareToken: {
          id: vaultAddress.toLowerCase(),
          decimals: Number(vaultResults.get(`${vaultAddress}-decimals`).output.data.toString()),
        },
        token: {
          id: tokenAddress,
          decimals: underlyingMap.get(tokenAddress).decimals,
        },
      };
    });
  }

  async getVaultsPricePerShare(vaults: Address[]): Promise<Map<Address, string>> {
    const calls = vaults.reduce((acc, token) => {
      const proxy = new ShareTokenAbi(token);
      acc.set(token, proxy.pricePerShare());
      return acc;
    }, new Map());

    const rawResponse = await this.multicallService.handleInBatches(calls);

    const response = new Map<Address, string>();
    rawResponse.forEach((callData, address) => {
      response.set(address, callData.output.data.toString());
    });

    return response;
  }
}
