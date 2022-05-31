import { plainToClass } from 'class-transformer';

import { Injectable } from '@nestjs/common';

import {
  Address,
  ChainDto,
  ChainIdEnum,
  FeatureEnum,
  ProjectEnum,
  ProtocolNameEnum,
  ProtocolTypeEnum,
} from '@app/common';
import { BaseDataStaking } from '@app/common/dto/base.data.staking.dto';
import {
  IntegrationERC20TokenDto,
  IntegrationPoolTokenDto,
  IntegrationStakingPositionDto,
} from '@app/common/jobs/staking';
import { normalizeDecimals } from '@app/common/utils';
import { ERC20 } from '@app/common/web3provider/contracts/ERC20';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { AccountService } from '../../../../microservices/account.service';
import { PriceService } from '../../../../microservices/price.service';
import { IFeature } from '../abracadabra.interfaces';

@Injectable()
export class AbracadabraStaking implements IFeature {
  constructor(
    private readonly multicall: MulticallAggregator,
    protected readonly priceService: PriceService,
    protected readonly accountService: AccountService,
  ) {}

  async getData(addresses: Address[], chain: ChainDto): Promise<BaseDataStaking[]> {
    // Staking is only available on eth
    if (chain.id !== ChainIdEnum.eth) return [];

    const sSpellAddress = '0x26fa3fffb6efe8c1e69103acb4044c26b9a106a9';
    const spellAddress = '0x090185f2135308bad17527004364ebcc2d37e5f6';

    const balances = await this.accountService.getBalancesPost(
      addresses.concat(sSpellAddress),
      [chain.id],
      [sSpellAddress, spellAddress], // don't need spell balance, just getting token details
    );

    const sSpellTotalSupply = await this.getSSpellTotalSupply(sSpellAddress, chain);

    return addresses.map((address) => {
      const items = [];

      // User Balance
      const balance = balances[address].tokens.find((t) => t.token.address === sSpellAddress);

      // Spell Token Details
      const stakedBalance = balances[sSpellAddress].tokens.find(
        (t) => t.token.address === spellAddress,
      );

      if (balance?.decimalsAmount) {
        const ratio = stakedBalance.decimalsAmount / sSpellTotalSupply;
        const sSpellPrice = stakedBalance.tokenPriceUSD * ratio;
        const spellBalance = balance.decimalsAmount * ratio;

        items.push(
          plainToClass(IntegrationStakingPositionDto, {
            address: balance.token.address,
            poolName: balance.token.symbol,
            staked: balance.amount, // TODO: show actual underlying spell amount?
            rewards: [],
            stakingToken: plainToClass(IntegrationERC20TokenDto, {
              address: balance.token.address,
              name: balance.token.name,
              symbol: balance.token.symbol,
              decimals: balance.token.decimals,
              price: sSpellPrice,
              balance: balance.decimalsAmount,
              value: balance.decimalsAmount * sSpellPrice,
              tokens: [
                plainToClass(IntegrationPoolTokenDto, {
                  address: stakedBalance.token.address,
                  name: stakedBalance.token.name,
                  symbol: stakedBalance.token.symbol,
                  decimals: stakedBalance.token.decimals,

                  value: spellBalance * stakedBalance.totalPriceUSD,
                  balance: spellBalance,
                  price: stakedBalance.tokenPriceUSD,
                }),
              ],
            }),
          }),
        );
      }

      return plainToClass(BaseDataStaking, {
        chain,
        projectName: ProjectEnum.abracadabra,
        protocolName: ProtocolNameEnum.abracadabra,
        userAddress: address,
        protocolType: ProtocolTypeEnum.borrowing,
        feature: FeatureEnum.staking,
        items,
      });
    });
  }

  private async getSSpellTotalSupply(sSpell: Address, chain: ChainDto): Promise<number> {
    const results = await this.multicall.handleInBatches(
      new Map([['totalSupply', new ERC20(sSpell).totalSupply()]]),
      chain.id,
    );
    return normalizeDecimals(results.get('totalSupply').output.data.toString(), 18);
  }
}
