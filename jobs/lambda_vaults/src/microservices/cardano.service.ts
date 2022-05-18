import { BlockFrostAPI } from '@blockfrost/blockfrost-js';
import { components } from '@blockfrost/blockfrost-js/lib/types/OpenApi';

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type IAddressUtxosContent = components['schemas']['address_utxo_content'];

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
}
