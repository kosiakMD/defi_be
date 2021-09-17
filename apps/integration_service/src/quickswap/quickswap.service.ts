import { plainToClass } from 'class-transformer';

import { Injectable } from '@nestjs/common';

import { Logger } from '@app/common/Logger/Logger.service';
import BaseDataDto from '@app/common/dto/BaseData.dto';
import { ChainIdEnum, ProjectEnum, ProtocolNameEnum, ProtocolTypeEnum } from '@app/common/enum';
import { Address, BalancesResponse } from '@app/common/types';

import { AccountService } from '../account/account.service';
import { Mapper } from '../mappers/mapper';
import { QuickswapSubgraph } from '../thegraph/quickswap.subgraph';
import { ERC20TokenDto } from '../uniswap/dto/erc20.token.dto';
import { LiquidityPoolDto } from '../uniswap/dto/liquidity.pool.dto';
import { liquidityPositionDto } from '../uniswap/dto/liquidity.position.dto';
import { PoolTokenDto } from '../uniswap/dto/pool.token.dto';
import { getUniqueAndToLowerCaseArrayData } from '../utils/util';
import { SubgraphPairDto } from './dto';

@Injectable()
export class QuickswapService {
  private DECIMALS = 18;

  constructor(
    private readonly accountService: AccountService,
    private readonly quickswapSubgraph: QuickswapSubgraph,
    private readonly logger: Logger,
  ) {}

  private mapTokenAddressesFromResponse(
    response: BalancesResponse,
    addresses: Address[],
  ): Record<Address, Address[]> {
    const tokensByAccount = new Map<Address, Address[]>();

    addresses.forEach((address) => {
      const tokens = new Set<Address>();

      response[address]?.tokens.forEach(({ token }) => tokens.add(token.address));

      tokensByAccount.set(address, [...tokens]);
    });

    return Object.fromEntries(tokensByAccount);
  }

  private async mapToBase(
    userAddress: Address,
    pairs: SubgraphPairDto[],
    chainId = ChainIdEnum.plg,
    projectName = ProjectEnum.quickswap,
    protocolName = ProtocolNameEnum.quickswap,
  ): Promise<BaseDataDto<ProtocolTypeEnum.amm>> {
    const liquidityPositions: liquidityPositionDto[] = [];

    const userBalances = await this.accountService.getBalances([userAddress]);

    pairs.forEach((pair) => {
      const { id, reserveUSD, totalSupply } = pair;

      const {
        amount: lpTokenOriginBalance,
        token: { name: lpTokenName, symbol: lpTokenSymbol },
      } = userBalances[userAddress].tokens.find((token) => token.token.address === id);

      const lpTokenBalance = Number(lpTokenOriginBalance) / 10 ** this.DECIMALS;

      const pool = plainToClass(LiquidityPoolDto, {
        address: id,
        name: protocolName,
      });

      const lpToken = plainToClass(ERC20TokenDto, {
        address: id,
        decimals: this.DECIMALS,
        name: lpTokenName,
        symbol: lpTokenSymbol,
        totalSupply: totalSupply,
      });

      const userPoolShare = Number(lpTokenBalance) / Number(totalSupply);

      const poolTokens: PoolTokenDto[] = [];

      for (let id = 0; id < 2; id++) {
        const token = pair[`token${id}`];
        const tokenReserve = pair[`reserve${id}`];

        poolTokens.push(
          plainToClass(PoolTokenDto, {
            address: token.id,
            name: token.name,
            symbol: token.symbol,
            decimals: Number(token.decimals),
            reserve: tokenReserve,
            priceUSD: Mapper.priceInUSD(reserveUSD, tokenReserve),
            amount: (userPoolShare * Number(tokenReserve)).toString(),
          }),
        );
      }

      liquidityPositions.push(
        plainToClass(liquidityPositionDto, {
          pool,
          lpToken,
          lpTokenBalance,
          poolTokens,
        }),
      );
    });

    return plainToClass(BaseDataDto, {
      chainId,
      userAddress,
      platformName: projectName,
      protocolName,
      protocolType: ProtocolTypeEnum.amm,
      liquidityPositions,
    });
  }

  async getDataByAddresses(
    addresses: string,
    chainId?: ChainIdEnum,
  ): Promise<BaseDataDto<ProtocolTypeEnum.amm>[]> {
    try {
      const response = [];

      const originAddresses = addresses.split(',');
      const uniqueAddresses = getUniqueAndToLowerCaseArrayData(originAddresses);

      const balancesByAccount = await this.accountService.getBalances(uniqueAddresses, [chainId]);
      const tokenAddressesByAccount = this.mapTokenAddressesFromResponse(
        balancesByAccount,
        uniqueAddresses,
      );

      for (const address of uniqueAddresses) {
        const {
          data: { pairs: pairs },
        } = await this.quickswapSubgraph.getPairs(tokenAddressesByAccount[address]);

        response.push(await this.mapToBase(address, pairs));
      }
      return response;
    } catch (error) {
      this.logger.error(error, 'QuickswapService.getDataByAddress');
      throw new Error(error);
    }
  }
}
