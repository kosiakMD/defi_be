import { Injectable } from '@nestjs/common';

import { NftAssetsQueryDtoV1 } from '@app/common/dto/nft/nft.assets.query.dto.v1';
import { NftChainsResponseDto } from '@app/common/dto/nft/nft.chains.response.dto';
import { NftCollectionsQueryDtoV1 } from '@app/common/dto/nft/nft.collections.query.dto.v1';

import { NftAddressChainsAssetsDto } from '../common/dto/nft.address.chains.assets.dto';
import { NftAddressChainsCollectionsDto } from '../common/dto/nft.address.chains.collections.dto';

@Injectable()
export class NftService {
  async getChains(): Promise<NftChainsResponseDto> {
    return {
      chainIds: [1],
    };
  }

  async getCollections(query: NftCollectionsQueryDtoV1): Promise<NftAddressChainsCollectionsDto> {
    return query.addresses.reduce((res, address) => {
      res[address] = {
        chains: {
          chainId: query.chains.length ? query.chains[0] : 1,
          collections: [
            {
              name: 'Super Shiba Club',
              symbol: 'TES',
              description:
                'The Access Utility Token can be used to gain exclusive entry to premium giveaways, claimable metaverse avatar, and access to exclusive merch.',
              address: '0xc4cca459aef145bdcc8746e7d8ddc73083549c39',
            },
          ],
        },
      };
      return res;
    }, {});
  }

  async getAssets(query: NftAssetsQueryDtoV1): Promise<NftAddressChainsAssetsDto> {
    return query.addresses.reduce((res, address) => {
      res[address] = {
        chains: {
          chainId: query.chains.length ? query.chains[0] : 1,
          assets: [
            {
              id: '9119',
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
                  permalink:
                    'https://opensea.io/assets/0xb30182ac9d2b14b7b773c52ac22a511652ee4f75/493',
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
            },
          ],
        },
        totalAccountPrice: 100500,
        totalAccountPriceUsd: 22.5,
      };
      return res;
    }, {});
  }
}
