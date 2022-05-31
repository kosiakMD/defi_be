import { BlockFrostAPI } from '@blockfrost/blockfrost-js';
import { components } from '@blockfrost/blockfrost-js/lib/types/OpenApi';
import { Address, BaseAddress, RewardAddress } from '@emurgo/cardano-serialization-lib-nodejs';

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type AssetsBalance = components['schemas']['account_addresses_assets'];
export type AccountBalance = components['schemas']['account_content'];

@Injectable()
export class CardanoService {
  private blockfrost: BlockFrostAPI;

  constructor(private readonly configService: ConfigService) {
    this.blockfrost = new BlockFrostAPI({
      projectId: this.configService.get<string>('CARDANO_BLOCKFROST_API_KEY'),
    });
  }

  /** Get staked address from cardano Bech32 format address */
  public getStakeAddress(address: string): string {
    const addr = Address.from_bech32(address);
    const baseAddress = BaseAddress.from_address(addr);
    const stakeCredentials = baseAddress.stake_cred();

    const rewardAddressBytes = new Uint8Array(29);
    rewardAddressBytes.set([0xe1], 0);
    rewardAddressBytes.set(stakeCredentials.to_bytes().slice(4, 32), 1);
    const stakeAddress = RewardAddress.from_address(Address.from_bytes(rewardAddressBytes));

    return stakeAddress.to_address().to_bech32();
  }

  /**
   * Obtain information about assets associated with addresses of a specific account.
   * Assets list **doesn't** include native coin ADA
   *
   * @param stakeAddress - Bech32 stake address
   * @link https://docs.blockfrost.io/#tag/Cardano-Accounts/paths/~1accounts~1{stake_address}~1addresses~1assets/get
   * @returns Assets associated with the account addresses
   */
  public async assetsFromStakeAddress(stakeAddress: string): Promise<AssetsBalance> {
    return this.blockfrost.accountsAddressesAssets(stakeAddress);
  }

  /**
   * accounts - Obtain information about a specific stake account.
   *
   * @param stakeAddress - Bech32 stake address
   * @link https://docs.blockfrost.io/#tag/Cardano-Accounts/paths/~1accounts~1{stake_address}/get
   * @returns Information about a specific stake account.
   */
  public async obtainInformationAboutStakedAccount(stakeAddress: string): Promise<AccountBalance> {
    return this.blockfrost.accounts(stakeAddress);
  }
}
