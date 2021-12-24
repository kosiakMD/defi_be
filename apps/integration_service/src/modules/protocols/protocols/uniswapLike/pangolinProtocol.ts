import { plainToClass } from 'class-transformer';

import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import {
  Address,
  ChainDto,
  IncomeLiquidityPositionPair,
  IncomeToken,
  Logger,
  PoolTokenDto,
} from '@app/common';
import { FeatureEnum, ProtocolTypeEnum } from '@app/common';
import { ERC20Token } from '@app/common/dto/ERC20Token';
import { BaseDataLp } from '@app/common/dto/base.data.lp.dto';
import { LiquidityPoolFeature } from '@app/common/dto/liquidity.pool.dto';
import { ChainAbbrEnum, PangolinProtocolEnum, ProjectEnum } from '@app/common/enum';

import { BaseData } from '../../../../common/interfaces/transactions.interfaces';

import { AccountService } from '../../../microservices/account.service';
import { PriceService } from '../../../microservices/price.service';
import { PangolinSubgraph } from '../../../subgraphs/subgraphs/pangolin.subgraph';
import { Mapper } from '../../helpers/mappers/mapper';
import AbstractProtocol from '../abstractProtocol';
import UniswapLikeProtocol from './uniswapLikeProtocol';
import { keepETHAddresses } from '@app/common/utils';

@Injectable()
export class PangolinProtocol extends UniswapLikeProtocol implements AbstractProtocol {
  readonly chains = [ChainAbbrEnum.avax];
  readonly project = ProjectEnum.pangolin;
  readonly name = PangolinProtocolEnum.pangolin;
  readonly displayName = 'Pangolin';
  readonly features = {
    [ChainAbbrEnum.avax]: [FeatureEnum.pools],
  };
  public feeRate = 0.003;

  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected readonly logger: Logger,
    protected readonly accountService: AccountService,
    protected readonly priceService: PriceService,
    protected readonly subgraph: PangolinSubgraph,
    protected readonly mapper: Mapper,
  ) {
    super();
  }

  public async getAllFeaturesBaseData(
    addresses: Address[],
    chain: ChainDto,
  ): Promise<[BaseData[], string[]]> {
    addresses = keepETHAddresses(addresses);
    const baseData: BaseData[] = [];
    const errors: string[] = [];

    const { response } = await this.getSubgraphData(addresses, this.subgraph, chain.abbr);

    addresses.forEach((address) => {
      try {
        const pools = response.subgraphPools.get(address);
        const items = pools.reduce((acc, cur) => {
          if (!Number(cur.liquidityTokenBalance)) {
            return acc;
          }

          const userShare = Number(cur.liquidityTokenBalance) / Number(cur.pair.totalSupply);
          const item = plainToClass(LiquidityPoolFeature, {
            address: cur.pair.id,
            name: null,
            lpToken: PangolinProtocol.formatLpToken(cur.pair),
            user: {
              share: userShare,
            },
            tokens: [
              PangolinProtocol.formatPoolToken(cur.pair.token0, cur.pair.reserve0, userShare),
              PangolinProtocol.formatPoolToken(cur.pair.token1, cur.pair.reserve1, userShare),
            ],
          });

          acc.push(item);
          return acc;
        }, [] as LiquidityPoolFeature[]);

        const toAdd: BaseDataLp = plainToClass(BaseDataLp, {
          chain: chain,
          userAddress: address,
          protocolType: ProtocolTypeEnum.amm,
          projectName: ProjectEnum.pangolin,
          items,
          feature: FeatureEnum.pools,
        });

        baseData.push(toAdd);
      } catch (e) {
        errors.push(e.message);
      }
    });

    return [baseData, errors];
  }

  private static formatLpToken(pair: IncomeLiquidityPositionPair) {
    return plainToClass(ERC20Token, {
      address: pair.id,
      decimals: 18, // always 18 in Uniswap
      name: null,
      symbol: null,
      totalSupply: pair.totalSupply,
    } as ERC20Token);
  }

  private static formatPoolToken(token: IncomeToken, reserve: string, userShare: number) {
    return plainToClass(PoolTokenDto, {
      address: token.id,
      decimals: Number(token.decimals),
      name: token.name,
      symbol: token.symbol,
      reserve: reserve,
      balance: (userShare * Number(reserve)).toString(),
    });
  }
}

export default PangolinProtocol;
