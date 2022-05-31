import { plainToClass } from 'class-transformer';

import { Injectable } from '@nestjs/common';

import {
  Address,
  ChainDto,
  ClaimableDto,
  FeatureEnum,
  IntegrationClaimableTokenDto,
  ProjectEnum,
  ProtocolNameEnum,
  ProtocolTypeEnum,
} from '@app/common';
import { BaseDataClaimable } from '@app/common/dto/base.data.claimable.dto';
import { normalizeDecimals } from '@app/common/utils';
import { CauldronContract } from '@app/common/web3provider/contracts/protocols/abracadabra/abracadabra-market';
import { BentoBox } from '@app/common/web3provider/contracts/protocols/abracadabra/bento-box';
import { MulticallAggregator } from '@app/common/web3provider/multicall.aggregator';

import { Asset } from '../../../../../common/interfaces/transactions.interfaces';

import { AccountService } from '../../../../microservice/account.service';
import { PriceService } from '../../../../microservice/price.service';
import { ACTIVE_CAULDRONS } from '../abracadabra.constants';
import { IFeature } from '../abracadabra.interfaces';

@Injectable()
export class AbracadabraClaimable implements IFeature {
  constructor(
    private readonly multicall: MulticallAggregator,
    protected readonly priceService: PriceService,
    protected readonly accountService: AccountService,
  ) {}

  async getData(addresses: Address[], chain: ChainDto): Promise<BaseDataClaimable[]> {
    const { bentoBoxes, mimAddress } = await this.getBentoBoxAddresses(
      ACTIVE_CAULDRONS.get(chain.id),
      chain,
    );
    const [mim, price] = await Promise.all([
      this.fetchAsset(mimAddress, chain),
      this.fetchPrice(mimAddress, chain),
    ]);

    const balances = await this.getUserBalances(addresses, bentoBoxes, mim, chain);

    return addresses.map((address) => {
      const items = [];
      const balance = balances.get(address);

      if (balance) {
        items.push(
          plainToClass(IntegrationClaimableTokenDto, {
            address: mim.address,
            name: mim.name,
            symbol: mim.symbol,
            decimals: mim.decimals,
            totalSupply: mim.totalSupply,
            price,
            claimableData: plainToClass(ClaimableDto, {
              balance,
              value: balance * price,
            }),
          }),
        );
      }

      return plainToClass(BaseDataClaimable, {
        chain,
        projectName: ProjectEnum.abracadabra,
        protocolName: ProtocolNameEnum.abracadabra,
        userAddress: address,
        protocolType: ProtocolTypeEnum.borrowing,
        feature: FeatureEnum.claimable,
        items,
      });
    });
  }

  private async getUserBalances(
    addresses: Address[],
    bentoBoxes: Address[],
    mim: Asset,
    chain: ChainDto,
  ): Promise<Map<Address, number>> {
    const calls = new Map();

    addresses.forEach((address) => {
      bentoBoxes.forEach((bentoBox) => {
        const contract = new BentoBox(bentoBox);
        calls.set(
          AbracadabraClaimable.claimableBalanceLabel(address, bentoBox),
          contract.balanceOf(mim.address, address),
        );
      });
    });
    const results = await this.multicall.handleInBatches(calls, chain.id);

    const userBalances = new Map();
    addresses.forEach((address) => {
      let balance = 0;
      bentoBoxes.forEach((bentoBox) => {
        const rawBalance = results
          .get(AbracadabraClaimable.claimableBalanceLabel(address, bentoBox))
          .output.data.toString();

        balance += normalizeDecimals(rawBalance, mim.decimals);
      });

      userBalances.set(address, balance);
    });

    return userBalances;
  }

  static claimableBalanceLabel(user: Address, bentoBox: Address) {
    return `${user}-${bentoBox}-claimable`;
  }

  private async getBentoBoxAddresses(
    cauldrons: Address[],
    chain: ChainDto,
  ): Promise<{ bentoBoxes: Address[]; mimAddress: Address }> {
    const calls = new Map();
    cauldrons.forEach((cauldron) => {
      const cauldronContract = new CauldronContract(cauldron);
      calls.set(cauldron, cauldronContract.bentoBox());
      calls.set('magic-internet-money', cauldronContract.magicInternetMoney());
    });

    const results = await this.multicall.handleInBatches(calls, chain.id);

    const addresses = new Set<Address>();
    cauldrons.forEach((cauldron) => {
      addresses.add(results.get(cauldron).output.data.toString().toLowerCase());
    });

    return {
      bentoBoxes: Array.from(addresses),
      mimAddress: results.get('magic-internet-money').output.data.toString().toLowerCase(),
    };
  }

  private async fetchAsset(address: Address, chain: ChainDto): Promise<Asset> {
    const { data } = await this.accountService.getAssets([address], [chain.id]);
    return (
      data?.find((token) => token.address === address) ??
      ((await this.accountService.getTrackedAssets(address, chain.id)) as unknown as Asset)
    );
  }

  private async fetchPrice(address: Address, chain: ChainDto): Promise<number> {
    const { prices } = await this.priceService.getTokenPricesFetch([address], chain.id);
    return Number(prices[address]);
  }
}
