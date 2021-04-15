import { HttpService, Injectable } from '@nestjs/common';
import Web3 from 'web3';
import { AbiItem } from 'web3-utils';

import { CoingeckoApi } from '../../apis/api/coingecko.api';
import { CurveApi } from '../../apis/api/curve.api';
import { Web3Provider } from '../web3.provider';
import { decodedGauges, multicall, controller, poolInfo } from './contracts';
import { CRV } from './tokens/CRV';

@Injectable()
export class GaugeRewards {
  private readonly web3: Web3;
  private multicallContract;
  constructor(
    private readonly httpService: HttpService,
    private readonly web3Provider: Web3Provider,
    private readonly coingecko: CoingeckoApi,
    private readonly curveApi: CurveApi,
  ) {
    this.web3 = web3Provider.instance();
    this.multicallContract = new this.web3.eth.Contract(
      multicall.abi as AbiItem[],
      multicall.address,
    );
  }
  async getGaugesRewards(): Promise<any> {
    const gaugeControllerAddress = controller.address;
    const gaugeRelativeWeight = '0x6207d866000000000000000000000000';

    const tokenPrices = await this.coingecko.getPricesByAddresses(['usd'], [CRV.address]);
    const CRVToken = {
      ...CRV,
      priceUSD: tokenPrices[CRV.address]['usd'],
    };

    const coinsPrices = await this.coingecko.getUSDPricesByIds('usd', ['bitcoin', 'ethereum']);
    const coinDataBitcoin = coinsPrices.find((cp) => cp.id === 'bitcoin');
    const bitcoinPriceUSD = coinDataBitcoin.current_price;

    const weightCalls = decodedGauges.map((gauge) => [
      gaugeControllerAddress,
      gaugeRelativeWeight + gauge.slice(2),
    ]);

    const aggCallsWeights = await this.multicallContract.methods.aggregate(weightCalls).call();
    const decodedWeights = aggCallsWeights[1].map((hex, i) => [
      weightCalls[i][0],
      Number(this.web3.eth.abi.decodeParameter('uint256', hex)) / 1e18,
    ]);
    const ratesCalls = decodedGauges.map((gauge) => [
      [gauge, '0x180692d0'],
      [gauge, '0x17e28089'],
    ]);
    const aggRates = await this.multicallContract.methods
      .aggregate(ratesCalls.reduce((acc, val) => acc.concat(val), []))
      .call();
    const decodedRate = aggRates[1].map((hex) => this.web3.eth.abi.decodeParameter('uint256', hex));
    const gaugeRates = decodedRate.filter((_, i) => i % 2 == 0).map((v) => v / 1e18);
    const workingSupplies = decodedRate.filter((_, i) => i % 2 == 1).map((v) => v / 1e18);
    const virtualPriceCalls = Object.keys(poolInfo)
      .map((key) => poolInfo[key])
      .map((v) => [v.swap, '0xbb7b8b80']);
    const aggVirtualPrices = await this.multicallContract.methods
      .aggregate(virtualPriceCalls)
      .call();
    const decodedVirtualPrices = aggVirtualPrices[1].map((hex, i) => [
      virtualPriceCalls[i][0],
      Number(this.web3.eth.abi.decodeParameter('uint256', hex)) / 1e18,
    ]);
    const lendingAPYs = await this.getPoolsApy();
    const data = [];
    decodedWeights.map((weight, i) => {
      const result = {};
      const pool = Object.keys(poolInfo)
        .map((key) => poolInfo[key])
        .find(
          (value) => value.gauge.toLowerCase() == '0x' + weightCalls[i][1].slice(34).toLowerCase(),
        ).name;
      result['swap_address'] = poolInfo[pool].swap;
      result['virtual_price'] = decodedVirtualPrices.find(
        (price) => price[0].toLowerCase() == result['swap_address'].toLowerCase(),
      )[1];
      result['working_supply'] = ['ren', 'sbtc', 'hbtc', 'tbtc'].includes(pool)
        ? (workingSupplies[i] *= bitcoinPriceUSD)
        : workingSupplies[i];
      result['rate'] =
        (((gaugeRates[i] * weight[1] * 31536000) / result['working_supply']) * 0.4) /
        result['virtual_price'];
      result['apy'] = result['rate'] * CRVToken.priceUSD * 100;
      result['lending'] = lendingAPYs[pool];
      data.push({ name: pool, data: result });
    });
    return data;
  }

  async getPoolsApy(): Promise<any> {
    const apiApys = await this.curveApi.getApys();
    for (const [key, value] of Object.entries(apiApys.apy.day)) {
      let name = key;
      if (key === 'ren2') {
        name = 'ren';
      } else if (key === 'susd') {
        name = 'susdv2';
      } else if (key === 'rens') {
        name = 'sbtc';
      }
      apiApys[name] = +value * 100;
    }
    return apiApys;
  }
}
