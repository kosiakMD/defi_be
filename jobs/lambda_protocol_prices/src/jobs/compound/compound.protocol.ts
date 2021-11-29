// eslint-disable-next-line max-classes-per-file
import BigNumber from 'bignumber.js';
import { plainToClass } from 'class-transformer';

import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Address, ChainIdEnum, CurrencyIdEnum, Logger } from '@app/common';
import { IPriceRequestCurrent } from '@app/common/interfaces/price.request.current';

import { CallData } from '../../chain/dto/call.data';
import { MulticallService } from '../../chain/multicall.service';
import { AccountService } from '../../microservices/account.service';
import { PriceService } from '../../microservices/price.service';
import { IProtocolPriceUpdate } from '../interfaces/protocol.price.update';
import { CErc20DelegateAbi } from './abis/CErc20DelegateAbi';
import { tokens, underlying } from './constants';
import { BasicCToken } from './dtos/BasicCToken';
import { UnderlyingAssetInfo } from './dtos/UnderlyingAssetInfo';

@Injectable()
export class CompoundProtocol implements IProtocolPriceUpdate {
  chains = [ChainIdEnum.eth];
  chain: ChainIdEnum;
  job = `CompoundProtocol_TokenPriceUpdate`;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    private readonly accountService: AccountService,
    private readonly multicallService: MulticallService,
    private readonly priceService: PriceService,
    private readonly configService: ConfigService,
  ) {
    this.chain = configService.get('CHAIN_ID');
  }

  async update() {
    const timeKey = `Protocol Prices - Compound.Finance`;
    try {
      this.logger.time(timeKey);
      // https://compound.finance/docs
      // 1. Get Compound Tokens
      // 2. Get exchangeRateStored
      // 3. Get underlying tokens
      // 4. Get Price Of Underlying Tokens (DAI, USD, ETC)

      // Get the array of tokens
      const addresses: Address[] = Object.values(tokens);

      // Get the exchange rate & underlying tokens via multicall
      const cTokenData = await this.getExchangeRateInfo(addresses);
      // Get the price & decimals of the underlying tokens
      const underlyingAssetMap = await this.getUnderlyingAssets(cTokenData);

      // Format each token into a priceDto for saving & return to the parent
      const formatted = this.formatExchangeRatePrices(cTokenData, underlyingAssetMap);
      this.logger.timeEnd(timeKey);
      return formatted;
    } catch (e) {
      this.logger.error('Failed to update Compound.finance cToken prices', e);
      return [];
    }
  }

  async getExchangeRateInfo(addresses: Address[]): Promise<BasicCToken[]> {
    const calls = new Map<string, CallData>();
    const callIds = new Map<string, string[]>();

    addresses.forEach((address) => {
      const proxy = new CErc20DelegateAbi(address);

      const exchangeKey = `${proxy.abi.exchangeRateStored.name}-${address}`;
      const underlyingKey = `${proxy.abi.underlying.name}-${address}`;

      callIds.set(address, [exchangeKey, underlyingKey]);
      calls.set(exchangeKey, proxy.exchangeRateStored());

      if (!underlying[address]) {
        calls.set(underlyingKey, proxy.underlying());
      }
    });

    const response = await this.multicallService.handleInBatches(calls);

    return addresses.map((address) => {
      const [exchangeKey, underlyingKey] = callIds.get(address.toString());

      // cETH has no underlying token, so the underlying is hardcoded
      const underlyingAddress =
        underlying[address] ?? response.get(underlyingKey.toString()).output.data.toLowerCase();

      return plainToClass(BasicCToken, {
        address: address.toLowerCase(),
        underlying: underlyingAddress,
        exchangeRate: response.get(exchangeKey.toString()).output.data.toString(),
      });
    });
  }

  async getUnderlyingAssets(cTokenData: BasicCToken[]) {
    const underlying = [...new Set(cTokenData.map((v) => v.underlying))];

    const [assets, prices] = await Promise.all([
      this.accountService.getAssets(underlying, this.chain),
      this.priceService.getPrices(underlying, this.chain),
    ]);

    return new Map<Address, UnderlyingAssetInfo>(
      underlying.map((address) => {
        const asset = assets.find((a) => a.address === address);
        return [
          address,
          plainToClass(UnderlyingAssetInfo, {
            price: prices.prices[address],
            decimals: asset.decimals,
          }),
        ];
      }),
    );
  }

  async formatExchangeRatePrices(
    cTokenData: BasicCToken[],
    assetData: Map<string, any>,
  ): Promise<IPriceRequestCurrent[]> {
    return cTokenData.map((cToken) => {
      const asset = assetData.get(cToken.underlying);

      return {
        address: cToken.address,
        price: this.formatExchangeRate(cToken.exchangeRate, asset.decimals)
          .times(asset.price)
          .toNumber(),
        chainId: ChainIdEnum.eth,
        currencyId: CurrencyIdEnum.usd,
      };
    });
  }

  formatExchangeRate(exchangeRateStored: string, underlingDecimal: number) {
    // https://compound.finance/docs/ctokens#exchange-rate
    // return exchangeRateStored / 10 **(18 - 8 + underlyingDecimal)
    return new BigNumber(exchangeRateStored).div(new BigNumber(10).pow(18 - 8 + underlingDecimal));
  }
}
