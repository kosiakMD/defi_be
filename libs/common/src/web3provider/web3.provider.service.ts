import { LCDClient } from '@terra-money/terra.js';
import Web3 from 'web3';

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { AbsoluteChainIdEnum, ChainIdEnum } from '..';
import { MulticallContract } from './multicall.contract';

export type Web3Interface = Web3;

@Injectable()
export class Web3ProviderService {
  // TODO: This should be Web3 not any
  private readonly providers = new Map<ChainIdEnum, any>();
  private readonly multicallContracts = new Map<ChainIdEnum, MulticallContract>();

  constructor(private readonly configService: ConfigService) {
    this.setLCDClientProvider(ChainIdEnum.terra, 'TERRA_URL');

    // TODO: Consolidate RPC env variables across services. Currently
    // Account service does not conform to the other services & jobs
    // for several variables and this causes multicall to break.
    // The initial value is used by most services & jobs.
    // The secondary fallback value provided is the one used by account service
    this.setProvider(ChainIdEnum.arbi, 'ARBITRUM_URL');
    this.setProvider(ChainIdEnum.avax, 'AVAX_URL', 'AVALANCHE_URL');
    this.setProvider(ChainIdEnum.bnb, 'BSC_URL', 'BINANCE_URL');
    this.setProvider(ChainIdEnum.boba, 'BOBA_URL');
    this.setProvider(ChainIdEnum.celo, 'CELO_URL');
    this.setProvider(ChainIdEnum.cro, 'CRONOS_URL');
    this.setProvider(ChainIdEnum.eth, 'ETH_URL', 'ETHEREUM_URL');
    this.setProvider(ChainIdEnum.ftm, 'FTM_URL', 'FANTOM_URL');
    this.setProvider(ChainIdEnum.fuse, 'FUSE_URL'); // missing in account service
    this.setProvider(ChainIdEnum.gnosis, 'GNOSIS_URL');
    this.setProvider(ChainIdEnum.harm, 'HARM_URL', 'HARMONY_URL');
    this.setProvider(ChainIdEnum.heco, 'HECO_URL');
    this.setProvider(ChainIdEnum.kcc, 'KCC_URL', 'KUCOIN_URL');
    this.setProvider(ChainIdEnum.klay, 'KLAYTN_URL'); // missing in account service
    this.setProvider(ChainIdEnum.mriver, 'MRIVER_URL', 'MOONRIVER_URL');
    this.setProvider(ChainIdEnum.near, 'AURORA_URL', 'NEAR_URL');
    this.setProvider(ChainIdEnum.okex, 'OKEX_URL');
    this.setProvider(ChainIdEnum.opt, 'OPT_URL', 'OPTIMISM_URL');
    this.setProvider(ChainIdEnum.plg, 'POLYGON_URL');
    this.setProvider(ChainIdEnum.milkomeda, 'MILKOMEDA_URL');
    this.setProvider(ChainIdEnum.metis, 'METIS_URL');
    this.setProvider(ChainIdEnum.ronin, 'RONIN_URL');
    this.setProvider(ChainIdEnum.iotex, 'IOTEX_URL');
    this.setProvider(ChainIdEnum.milkomeda, 'MILKOMEDA_URL');

    // TODO: Move contracts to configs
    this.setMulticall(ChainIdEnum.arbi, '0xAb16069D3E9E352343B2040ce7d7715C585994f9');
    this.setMulticall(ChainIdEnum.avax, '0x92a09557707ab4888eacc034122120f27362da7f');
    this.setMulticall(ChainIdEnum.bnb, '0x1ee38d535d541c55c9dae27b12edf090c608e6fb');
    this.setMulticall(ChainIdEnum.boba, '0x92A09557707AB4888EACC034122120F27362dA7f');
    this.setMulticall(ChainIdEnum.celo, '0xBc107e7E5e68Fc92E76A002381347846fD03F1C6');
    this.setMulticall(ChainIdEnum.cro, '0x11e14AEABbCD1774B37C4EE5E1aD3c831ACc2A2c');
    this.setMulticall(ChainIdEnum.eth, '0x255f2a7712cc06944aeef4ea78349c54c22ffe1f');
    this.setMulticall(ChainIdEnum.ftm, '0x11473d6e641df17cd6331d45b135e35b49edbea8');
    this.setMulticall(ChainIdEnum.fuse, '0x92a09557707ab4888eacc034122120f27362da7f');
    this.setMulticall(ChainIdEnum.gnosis, '0xe849A78ed40691d1e1512DbCBB3bcd78491ddba9');
    this.setMulticall(ChainIdEnum.harm, '0x34b415f4d3b332515e66f70595ace1dcf36254c5');
    this.setMulticall(ChainIdEnum.heco, '0x2bC9D53e7734913587f791389444119B90698037');
    this.setMulticall(ChainIdEnum.kcc, '0xE5B89aA6fb36E31BeA8AB13B73eB3291De95D4E7');
    this.setMulticall(ChainIdEnum.klay, '0x92a09557707ab4888eacc034122120f27362da7f');
    this.setMulticall(ChainIdEnum.mriver, '0x270f2F35bED92B7A59eA5F08F6B3fd34c8D9D9b5');
    this.setMulticall(ChainIdEnum.near, '0x32b50c286DEFd2932a0247b8bb940b78c063F16c');
    this.setMulticall(ChainIdEnum.okex, '0x11e14AEABbCD1774B37C4EE5E1aD3c831ACc2A2c');
    this.setMulticall(ChainIdEnum.opt, '0xaFE0A0302134df664f0EE212609CA8Fb89255BE4');
    this.setMulticall(ChainIdEnum.plg, '0xa1b2b503959aedd81512c37e9dce48164ec6a94d');
    this.setMulticall(ChainIdEnum.milkomeda, '0x2ecBF8b054Ef234F3523D605E7ba9cfE9A37703a');
    this.setMulticall(ChainIdEnum.metis, '0x92A09557707AB4888EACC034122120F27362dA7f');
    // TODO: To be added
    // this.setMulticall(ChainIdEnum.ronin, '');
    // this.setMulticall(ChainIdEnum.iotex, '');
    this.setMulticall(ChainIdEnum.milkomeda, '0x92A09557707AB4888EACC034122120F27362dA7f');
  }

  public getInstanceByChainId(chain: ChainIdEnum) {
    return this.providers.get(chain);
  }

  public getMulticallByChainId(chain: ChainIdEnum): MulticallContract {
    return this.multicallContracts.get(chain);
  }

  private setProvider(chain: ChainIdEnum, env: string, fallback?: string) {
    const rpc = this.configService.get(env) || this.configService.get(fallback);
    this.providers.set(chain, new Web3(rpc));
  }

  private setLCDClientProvider(chain: ChainIdEnum, env: string) {
    this.providers.set(
      chain,
      new LCDClient({
        URL: this.configService.get(env),
        chainID: String(AbsoluteChainIdEnum.terra),
      }),
    );
  }

  // TODO: pass 'env' selector instead of address (same as setProvider)
  private setMulticall(chain: ChainIdEnum, address: string) {
    this.multicallContracts.set(
      chain,
      new MulticallContract(this.getInstanceByChainId(chain), address),
    );
  }
}
