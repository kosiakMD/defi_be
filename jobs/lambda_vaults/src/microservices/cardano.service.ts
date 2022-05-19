import { BlockFrostAPI } from '@blockfrost/blockfrost-js';
import { components } from '@blockfrost/blockfrost-js/lib/types/OpenApi';

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type IAddressUtxosContent = components['schemas']['address_utxo_content'];
type IAssetsAddresses = components['schemas']['asset_addresses'];

/**
 * @description BlockFrost API implementation
 * @link https://github.com/blockfrost/blockfrost-js/wiki/BlockFrostAPI.md
 */
@Injectable()
export class CardanoService {
  private blockfrost: BlockFrostAPI;

  constructor(private readonly configService: ConfigService) {
    this.blockfrost = new BlockFrostAPI({
      projectId: this.configService.get<string>('CARDANO_BLOCKFROST_API_KEY'),
    });
  }

  /**
   * @param address Bech32 address
   * @returns UTXOs of the address
   */
  async obtainAddressesUtxos(address: string): Promise<IAddressUtxosContent> {
    return this.blockfrost.addressesUtxos(address);
  }

  /**
   *
   * @param asset Concatenation of the policy_id and hex-encoded asset_name
   * @returns List of a addresses containing a specific asset
   */
  async obtainAssetsAddresses(asset: string): Promise<IAssetsAddresses> {
    return this.blockfrost.assetsAddresses(asset);
  }
}
