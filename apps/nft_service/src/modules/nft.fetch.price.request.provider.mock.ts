import { Injectable } from '@nestjs/common';

import { IFetchPriceRequest } from '../common/interfaces/fetch.price.request.interface';

@Injectable()
export class NftFetchPriceRequestProviderMock {
  async getRequest(): Promise<IFetchPriceRequest> {
    return {
      assets: [
        {
          address: '0x8a90cab2b38dba80c64b7734e58ee1db38b8992e', //Doodles
          tokenId: '7794',
        },
        {
          address: '0x8a90cab2b38dba80c64b7734e58ee1db38b8992e', //Doodles
          tokenId: '4289',
        },
        {
          address: '0xed5af388653567af2f388e6224dc7c4b3241c544', // Azuki
          tokenId: '1180',
        },
        {
          address: '0x60e4d786628fea6478f785a6d7e704777c86a7c6', // MutantApeYachtClub
          tokenId: '28743',
        },
      ],
    };
  }
}
