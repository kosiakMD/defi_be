import { Injectable } from '@nestjs/common';

import { IFetchPriceRequest } from '../common/interfaces/fetch.price.request.interface';

@Injectable()
export class NftFetchPriceRequestProviderMock {
  async getRequest(): Promise<IFetchPriceRequest> {
    return {
      assets: [
        {
          collectionAddress: '0x8a90cab2b38dba80c64b7734e58ee1db38b8992e', //Doodles
          tokenId: '6817',
        },
        {
          collectionAddress: '0x8a90cab2b38dba80c64b7734e58ee1db38b8992e', //Doodles
          tokenId: '777',
        },
        {
          collectionAddress: '0x60e4d786628fea6478f785a6d7e704777c86a7c6', // MutantApeYachtClub
          tokenId: '28743',
        },
      ],
    };
  }
}
