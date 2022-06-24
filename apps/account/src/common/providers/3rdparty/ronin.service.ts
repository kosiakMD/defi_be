import { ChainsService } from 'apps/account/src/modules/chains/chains.service';

import { Injectable } from '@nestjs/common';

import { Address, ChainNameEnum } from '@app/common';

import { ERC20_ABI } from '../../../modules/approvals/abis/ERC20';
import { Balance } from '../../interfaces/ronin.interface';
import { Web3Provider } from '../chainRelated/web3.provider';

@Injectable()
export class RoninService {
  private readonly roninPrefix = 'ronin:';
  private readonly zeroXPrefix = '0x';
  private readonly hashStringRegExp = '[a-zA-z0-9]{40}';

  private readonly roninPrefixRegExp = new RegExp(`^${this.roninPrefix}`);
  private readonly roninAddressRegExp = new RegExp(`^${this.roninPrefix}${this.hashStringRegExp}$`);

  private web3: any;

  constructor(
    private readonly web3Provider: Web3Provider,
    private readonly chainsService: ChainsService,
  ) {
    this.onModuleInit();
  }

  async onModuleInit() {
    this.web3 = this.web3Provider.getInstance(
      await this.chainsService.getChainIdByName(ChainNameEnum.ronin),
    );
  }

  public async getBalances(address: Address, tokensAddresses: Address[]): Promise<Balance> {
    const balances: Balance = new Map();

    await Promise.all(
      tokensAddresses.map(async (tokenAddress) => {
        const tokenContract = new this.web3.eth.Contract(
          ERC20_ABI,
          this.convertRoninAddressTo0x(tokenAddress),
        );

        const weiAmount = await tokenContract.methods
          .balanceOf(this.convertRoninAddressTo0x(address))
          .call();

        if (+weiAmount) {
          balances.set(tokenAddress, weiAmount);
        }
      }),
    );

    return balances;
  }

  private convertRoninAddressTo0x(address: Address): string {
    return address.replace(this.roninPrefixRegExp, this.zeroXPrefix);
  }

  public isRoninAddress(address: Address): boolean {
    return this.roninAddressRegExp.test(address);
  }
}
