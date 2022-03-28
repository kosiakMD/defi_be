import { firstValueFrom } from 'rxjs';
import { map } from 'rxjs/operators';

import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';

import { ChainNameEnum } from '@app/common';
import type { Address } from '@app/common/types';

import { CosmosWallet, CosmosBalance, ICosmosProvider } from '../../../interfaces/cosmos.interface';
import { CosmostationProvider } from './cosmostation.provider';
import { KeplrProvider } from './keplr.provider';
import { ChainsService } from 'apps/account_service/src/modules/chains/chains.service';

@Injectable()
export class CosmosService {
  constructor(
    private readonly httpService: HttpService,
    private readonly cosmostationProvider: CosmostationProvider,
    private readonly keplrProvider: KeplrProvider,
    private readonly chainsService: ChainsService,
  ) {}

  public async getBalances(address: Address): Promise<CosmosBalance[]> {
    const provider: ICosmosProvider = this.getProvider(address);
    if (provider === null) return [];

    const balanceURL = provider.getUrl(address);
    const wallet = await firstValueFrom(
      this.httpService.get<CosmosWallet>(balanceURL).pipe(map((response) => response.data)),
    );
    return this.getCorrectBalanceField(wallet);
  }

  public isCosmosAddress(address: string): boolean {
    return !!/(^[a-zA-Z]+[1]{1})/g.exec(address)?.[0];
  }

  public async getChainId(): Promise<number> {
    return await this.chainsService.getChainIdByName(ChainNameEnum.cosmos);
  }

  private getProvider(address: string): ICosmosProvider {
    let network = '';
    if ((network = this.cosmostationProvider.getNetwork(address)) !== '') {
      this.cosmostationProvider.network = network;
      return this.cosmostationProvider;
    } else if ((network = this.keplrProvider.getNetwork(address)) !== '') {
      this.keplrProvider.network = network;
      return this.keplrProvider;
    }
    return null;
  }

  private getCorrectBalanceField(wallet: CosmosWallet): CosmosBalance[] {
    return 'result' in wallet ? wallet.result : wallet.balances;
  }
}
