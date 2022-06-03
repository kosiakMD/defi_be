import { firstValueFrom } from 'rxjs';
import type { AbiItem } from 'web3-utils';

import { HttpService } from '@nestjs/axios';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import type { Address, ChainId, Logger } from '@app/common';
import { ChainIdEnum } from '@app/common';

interface IBlockScoutResponse {
  data: {
    data?: {
      address: {
        smartContract: {
          abi: string;
        };
      };
    };
    errors?: {
      locations?: {
        column: number;
        line: number;
      }[];
      message: string;
    }[];
  };
}

@Injectable()
export class BlockScout {
  constructor(
    protected httpService: HttpService,
    protected config: ConfigService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) protected logger: Logger,
  ) {
    // Endpoints
    this.endpoints[ChainIdEnum.kcc] = config.get('BLOCKSCOUT_KCC_URL');
    this.endpoints[ChainIdEnum.metis] = config.get('BLOCKSCOUT_METIS_URL');
  }

  endpoints = {};

  async fetchAbi(address: Address, chain: ChainId): Promise<AbiItem[] | void> {
    if (!this.endpoints[chain]) {
      this.logger.debug(`Chain ${chain} not initialized for ABI fetching`, this.constructor.name);
      return;
    }

    const data$ = this.httpService.post(
      this.endpoints[chain],
      {
        variables: { address },
        query: `query FetchAbi($address: AddressHash) {
          address(hash: $address) {
            smartContract {
              abi
            }
          }
        }`,
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );

    const { data: res }: IBlockScoutResponse = await firstValueFrom(data$);

    const { errors, data } = res;

    if (errors) {
      this.logger.error(
        `Failed to retrieve BlockScout ABI ${chain}/${address}`,
        'BlockScoutService',
      );
      return;
    }

    try {
      return JSON.parse(data.address.smartContract.abi);
    } catch {
      // Fail Gracefully. Maybe it was never meant to be...
      return;
    }
  }
}
