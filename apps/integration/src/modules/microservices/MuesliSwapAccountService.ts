import { Address, ChainIdEnum } from '@app/common';
import { DetailedResponseDto } from '@app/common/dto';
import { chunk } from '@app/common/utils';

import { Asset } from '../../common/interfaces/transactions.interfaces';

import { AccountService } from './account.service';

export class MuesliSwapAccountService extends AccountService {
  async getAssets(
    addresses: Address[],
    chainIds?: ChainIdEnum[],
  ): Promise<DetailedResponseDto<Asset[]>> {
    const addressMap = new Map(addresses.map((address) => [address.replace('.', ''), address]));
    const keys = Array.from(addressMap.keys());
    const cacheKey = `getAssets_${keys.join(',')}_${chainIds.join(',')}`;

    return this.getOrSet(this.cacheTTLInSeconds, cacheKey, async () => {
      const dataArray = await Promise.all(
        // TODO: move max chunk size into env or constants
        chunk(keys, 250).map(async (addressChunk) => {
          const data = await this.httpService
            .get(this.getAssetsUrl, { params: { addresses: addressChunk, chains: chainIds } })
            .toPromise();

          return {
            ...data.data,
            data: data.data.data.map((d) => ({
              ...d,
              address: addressMap.get(d.address),
            })),
          };
        }),
      );

      return dataArray.reduce((acc, cur) => {
        acc.errors.push(...cur.errors);
        acc.data.push(...cur.data);
        return acc;
      });
    });
  }
}
