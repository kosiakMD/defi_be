import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Address, ChainIdEnum, Logger } from '@app/common';
import { CallData } from '@app/common/dto/CallData';
import { normalizeDecimals } from '@app/common/utils';

import { MulticallService } from '../../../chain/multicall.service';
import { AccountService } from '../../../microservices/account.service';
import { PriceService } from '../../../microservices/price.service';
import { IProtocolPriceUpdate } from '../../interfaces/protocol.price.update';
import { ProtocolBase } from '../protocol.base';
import { EXCHANGE_RATES_ADDRESS, ISSUER_ADDRESS, SUSD_ADDRESS } from './constants';
import { ExchangeRates } from './contracts/ExchangeRatesWithDexPricing';
import { Issuer } from './contracts/Issuer';
import { CurrencyKey } from './types';

@Injectable()
export class SynthetixProtocol extends ProtocolBase implements IProtocolPriceUpdate {
  chains = [
    ChainIdEnum.eth,
    // ChainIdEnum.opt // TODO
  ];
  job = `Synthetix_TokenPriceUpdate`;

  // Contracts
  issuer: Issuer;
  exchangeRates: ExchangeRates;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    protected readonly configService: ConfigService,
    protected readonly accountService: AccountService,
    protected readonly priceService: PriceService,
    protected readonly multicall: MulticallService,
  ) {
    super();
    this.chain = Number(configService.get('CHAIN_ID'));
    this.issuer = new Issuer(ISSUER_ADDRESS[this.chain]);
    this.exchangeRates = new ExchangeRates(EXCHANGE_RATES_ADDRESS[this.chain]);
  }

  async update() {
    const availableSynths = await this.getAvailableSynths();

    const synthCurrencyKeys = await this.getSynthCurrencyKeys(availableSynths);

    const [syntheticsExchangeRate, basePrice] = await Promise.all([
      this.getExchangeRate(synthCurrencyKeys),
      this.getBasePrice(),
    ]);

    return Array.from(syntheticsExchangeRate.entries()).map(([synth, exchangeRate]) =>
      this.formatPriceRequest(synth, exchangeRate * basePrice),
    );
  }

  /**
   * Gets the count of available synthetics
   */
  private async getSynthCount(): Promise<number> {
    const availableSynthCount = await this.multicall.call(this.issuer.availableSynthCount());
    return Number(availableSynthCount.toString());
  }

  /**
   * Gets the addresses of all available synthetics
   */
  private async getAvailableSynths(): Promise<Address[]> {
    const count = await this.getSynthCount();

    const synthIds = Array.from(Array(count).keys());

    const availableSynthCalls = new Map(
      synthIds.map((id) => [id.toString(), this.issuer.availableSynths(id)]),
    );

    const availableSynths = await this.multicall.handleInBatches(availableSynthCalls);

    return Array.from(availableSynths.values()).map((callData) =>
      callData.output.data.toString().toLowerCase(),
    );
  }

  /**
   * Gets the Currency Keys for requested synthetic addresses
   * Currency Keys are synthetixs internal unique id for each asset
   */
  private async getSynthCurrencyKeys(synths: Address[]): Promise<Map<Address, CurrencyKey>> {
    const synthCalls = new Map(synths.map((synth) => [synth, this.issuer.synthsByAddress(synth)]));

    const rawCurrencyKeyMap = await this.multicall.handleInBatches(synthCalls);

    return new Map(
      synths.map((synth) => [synth, rawCurrencyKeyMap.get(synth).output.data.toString()]),
    );
  }

  /**
   * Gets the exchange rates relative to sUSD price (sUSD price being exactly $1)
   */
  private async getExchangeRate(synths: Map<Address, CurrencyKey>): Promise<Map<Address, number>> {
    const requests = new Map<Address, CallData>();
    const responses = new Map<Address, number>();

    synths.forEach((currencyKey, synth) =>
      requests.set(synth, this.exchangeRates.rateForCurrency(currencyKey)),
    );

    const exchangeRateMap = await this.multicall.handleInBatches(requests);

    exchangeRateMap.forEach((callData, synth) => {
      responses.set(synth, normalizeDecimals(callData.output.data.toString(), 18));
    });

    return responses;
  }

  /**
   * All Exchange Rates on the exchange are relative to sUSD being exactly $1
   * Get sUSD price so we can calculate the true price in USD
   */
  private async getBasePrice(): Promise<number> {
    const sUsdAddress = SUSD_ADDRESS[this.chain];
    const { prices } = await this.fetchPrices([sUsdAddress]);
    return Number(prices[sUsdAddress]);
  }
}
