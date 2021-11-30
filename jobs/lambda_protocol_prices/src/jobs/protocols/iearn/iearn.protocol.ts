import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Address, ChainIdEnum, Logger } from '@app/common';
import { normalizeDecimals } from '@app/common/utils/number';

import { MulticallService } from '../../../chain/multicall.service';
import { AccountService } from '../../../microservices/account.service';
import { PriceService } from '../../../microservices/price.service';
import { IProtocolPriceUpdate } from '../../interfaces/protocol.price.update';
import { ProtocolBase } from '../protocol.base';
import { ShareTokenAbi } from './abis/ShareTokenAbi';
import { vaultAddresses } from './constants';
import { IVaultDetails } from './interfaces';

@Injectable()
export class IearnProtocol extends ProtocolBase implements IProtocolPriceUpdate {
  chains = [ChainIdEnum.eth]; // TODO: Fantom
  job = `Iearn_TokenPriceUpdate`;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    protected readonly configService: ConfigService,
    protected readonly accountService: AccountService,
    protected readonly priceService: PriceService,
    private readonly multicallService: MulticallService,
  ) {
    super();
    this.chain = Number(configService.get('CHAIN_ID'));
  }

  async update() {
    const timeKey = `Protocol Prices - Iearn.finance`;
    try {
      this.logger.time(timeKey);

      const vaults = await this.getRequiredVaultDetails(vaultAddresses);

      const underlyingTokens = Array.from(new Set(vaults.map((vault) => vault.token)));

      const { prices } = await this.fetchPrices(underlyingTokens);

      const response = vaults.reduce((acc, vault) => {
        if (!prices[vault.token]) {
          this.logger.warn(
            `[Iearn Pricing] Failed to fetch prices for token ${vault.vault} - (underlying: ${vault.token})`,
          );
          return acc;
        }
        const price = vault.pricePerShare * Number(prices[vault.token]);

        acc.push(this.formatPriceRequest(vault.vault, price));
        return acc;
      }, []);

      this.logger.timeEnd(timeKey);

      return response;
    } catch (e) {
      this.logger.error('Failed to update iearn.finance prices');
      this.logger.error(e);
      return [];
    }
  }

  async getRequiredVaultDetails(vaults: Address[]): Promise<IVaultDetails[]> {
    const calls = vaults.reduce((acc, address) => {
      const proxy = new ShareTokenAbi(address);
      acc.set(`${address}-decimals`, proxy.decimals());
      acc.set(`${address}-token`, proxy.token());
      acc.set(`${address}-getPricePerFullShare`, proxy.getPricePerFullShare());
      return acc;
    }, new Map());

    const rawResponse = await this.multicallService.handleInBatches(calls);

    const response = new Map<Address, IVaultDetails>();
    vaults.forEach((address) => {
      const decimals = Number(rawResponse.get(`${address}-decimals`).output.data.toString());
      const token = rawResponse.get(`${address}-token`).output.data.toString().toLowerCase();
      const getPricePerFullShare = normalizeDecimals(
        rawResponse.get(`${address}-getPricePerFullShare`).output.data.toString(),
        decimals,
      );

      response.set(address.toString(), {
        vault: address,
        token,
        pricePerShare: getPricePerFullShare,
      });
    });

    return Array.from(response.values());
  }
}
