import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { ChainIdEnum } from '@app/common';
import { ZERO_ADDRESS } from '@app/common/constant';
import { CurveAddresses } from '@app/common/constant/curve.addresses';
import { Logger } from '@app/common/logger/logger.service';
import { Web3ProviderService } from '@app/common/web3provider';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { CURVE_METAPOOL_ARBI_ABI } from '../../../../../common/abis/curve-metapool.abi';
import { CurveProviderAbi } from '../../../../../common/abis/curver-provider.abi';
import { CURVE_REGISTRY_ABI } from '../../../../../common/abis/curver-registry.abi';
import { CURVE_LP } from '../../../../../common/contracts/curve-lp.contract';
import { CURVE_REGISTRY_CONTRACT } from '../../../../../common/contracts/curve-registry.contract';

import { AssetEntity } from '../../../entities/asset.entity';
import { UnderlyingTokenStrategy } from './token-strategy';

@Injectable()
export class CurveStrategy implements UnderlyingTokenStrategy {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    private readonly web3Provider: Web3ProviderService,
    private readonly multicall: MulticallAggregator,
  ) {}

  async attemptToLoadUnderlyingTokens(asset: AssetEntity): Promise<string[]> {
    if (asset.chainId === ChainIdEnum.arbi) {
      const registries = await this.getCurveRegistries(ChainIdEnum.arbi);
      const registriesResp = await Promise.all(
        registries.map(async (address) => {
          let contract = new CURVE_REGISTRY_CONTRACT(
            address,
            this.web3Provider.getInstanceByChainId(asset.chainId),
            CURVE_REGISTRY_ABI,
          );
          let pool;
          try {
            pool = await contract.getPoolFromLpToken(asset.address);
            if (pool === ZERO_ADDRESS) return;
          } catch (e) {
            contract = new CURVE_REGISTRY_CONTRACT(
              address,
              this.web3Provider.getInstanceByChainId(asset.chainId),
              CURVE_METAPOOL_ARBI_ABI,
            );
          }
          try {
            return await contract.getCoinsForLpToken(pool ?? asset.address);
          } catch (e) {
            //
          }
        }),
      );

      const lpCoins = registriesResp?.find((resp) => resp);
      if (lpCoins?.length) {
        return lpCoins;
      }
    }

    let curveLpPool = new CURVE_LP(
      asset.address,
      this.logger,
      this.web3Provider.getInstanceByChainId(asset.chainId),
    );

    let minter;
    try {
      minter = await curveLpPool.getMinter();
    } catch (e) {
      //
    }

    if (minter && minter !== ZERO_ADDRESS) {
      curveLpPool = new CURVE_LP(
        minter,
        this.logger,
        this.web3Provider.getInstanceByChainId(asset.chainId),
      );
    }
    return await curveLpPool.getCoinsForLpToken();
  }

  private async getCurveRegistries(chain: ChainIdEnum) {
    const curveProvider = new CurveProviderAbi(CurveAddresses.addressProvider);
    const resp = await this.multicall.handleInBatches(
      [0, 3, 5].reduce((resp, value) => {
        resp.set(value, curveProvider.getIdInfo(value));
        return resp;
      }, new Map()),
      chain,
    );
    return Array.from(resp.values()).map((value) => value.output.data.addr);
  }
}
