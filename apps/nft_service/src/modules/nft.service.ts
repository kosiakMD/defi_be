import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common';
import { NftAssetsQueryDtoV1 } from '@app/common/dto/nft/nft.assets.query.dto.v1';
import { NftAssetsResponseDtoV1 } from '@app/common/dto/nft/nft.assets.response.dto.v1';
import { NftChainsResponseDto } from '@app/common/dto/nft/nft.chains.response.dto';
import { NftCollectionsQueryDtoV1 } from '@app/common/dto/nft/nft.collections.query.dto.v1';
import { NftCollectionsResponseDtoV1 } from '@app/common/dto/nft/nft.collections.response.dto.v1';

import { NftFetchPriceRequestProviderMock } from './nft.fetch.price.request.provider.mock';

@Injectable()
export class NftService {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    private readonly nftFetchPriceRequestProviderMock: NftFetchPriceRequestProviderMock,
  ) {}

  async fetchPrice() {
    //todo implement fetching price from marketplaces
    const mockReq = await this.nftFetchPriceRequestProviderMock.getRequest();
    this.logger.debug(`mockReq: ${JSON.stringify(mockReq)}`);
    return mockReq;
  }

  async getChains(): Promise<NftChainsResponseDto> {
    return {
      chainIds: [1],
    };
  }

  async getCollections(query: NftCollectionsQueryDtoV1): Promise<NftCollectionsResponseDtoV1> {
    return {
      collections: [
        {
          chainId: query.chains.length ? query.chains[0] : 1,
          wallets: query.addresses,
          name: 'Super Shiba Club',
          symbol: 'TES',
          description:
            'The Access Utility Token can be used to gain exclusive entry to premium giveaways, claimable metaverse avatar, and access to exclusive merch.',
          address: '0xc4cca459aef145bdcc8746e7d8ddc73083549c39',
        },
      ],
    };
  }

  async getAssets(query: NftAssetsQueryDtoV1): Promise<NftAssetsResponseDtoV1> {
    return query.addresses.reduce(
      (res, address) => {
        res.assets.push({
          id: '9119',
          chainId: query.chains.length ? query.chains[0] : 1,
          wallet: address,
          name: 'Super Shiba #9119',
          imageUrl:
            'https://lh3.googleusercontent.com/rEbgZYOxhKbjLR6nOJwKsPQKCAEmjJxguTKCZ27vHbHm1v3a4NrwYnUqNzaqq_zFjnC6PytLz5hQ3VC4HABPZ_KPzu478JvvzGFVBw',
          imageSvg: 'SVG element',
          price: 0.05,
          priceUsd: 34,
          traits: [
            {
              type: 'Hand',
              value: 'Hot Pink Skateboard',
            },
          ],
          collection: {
            name: 'Super Shiba Club',
            symbol: 'TES',
            description:
              'The Access Utility Token can be used to gain exclusive entry to premium giveaways, claimable metaverse avatar, and access to exclusive merch.',
            address: '0xc4cca459aef145bdcc8746e7d8ddc73083549c39',
            links: {
              site: 'https://supershibas.io/',
              image:
                'https://lh3.googleusercontent.com/RYF4Gc-9EcE7g_sbl3Aiaux5jkuq9DAe6pRe9PC7FUkFpsUAT1y3CLW-v75uJmKOXM2ST0WH-tnMvSPuvfCzBJLKY64FbthSSZwD=s120',
              bannerImage:
                'https://lh3.googleusercontent.com/j2V_S-FYmgoWnuba61apC1EPKfdzI-uIfoD6psHatOuWNXTeVHve8AZqBrt8Ze6P-u5UK12Rr1WK6o1h2DObXa7n2sKVws-aOg7hzqs=s2500',
              telegramUrl: 'https://t.me/durov',
              wikiUrl: 'https://en.wikipedia.org/wiki/Leet',
              discordUrl: 'https://discord.gg/angryapearmy',
              permalink: 'https://opensea.io/assets/0xb30182ac9d2b14b7b773c52ac22a511652ee4f75/493',
            },
            usernames: {
              medium: 'medium',
              twitter: 'defiyield_app',
              instagram: 'instagram_name',
            },
            tokenStandard: 'ERC1155',
            stats: {
              floorPrice: 0.025,
              ownersNumber: 1337,
              count: 4520,
            },
            balance: 2,
            totalCollectionPrice: 0.05,
            totalCollectionPriceUsd: 1750,
          },
        });
        res.totalAccountPrice = 100500;
        res.totalAccountPriceUsd = 22.5;
        return res;
      },
      { assets: [], totalAccountPrice: 0, totalAccountPriceUsd: 0, pages: 1, total: 3 },
    );
  }
}
