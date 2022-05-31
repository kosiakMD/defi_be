import { ChainIdEnum } from '..';
import { CollectionBaseDto } from '../dto/nft';

// INFO: Check https://docs.aavegotchi.com/subgraphs/core-matic-subgraph to read more about aavegotchi traits
export const aavegotchiTraits = [
  'Energy',
  'Aggression',
  'Spookiness',
  'Brain Size',
  'Eye Shape',
  'Eye Color',
];

export const aavegotchiCollectionPolygon: CollectionBaseDto = {
  address: '0x86935f11c86623dec8a25696e1c19a8659cbf95d',
  name: 'Aavegotchi',
  symbol: 'GOTCHI',
  slug: 'aavegotchi-polygon',
  description:
    'A collectible. An avatar. A true fren. Summon an Aavegotchi with a Portal or acquire one in the Baazaar. Claim a name for your Aavegotchi that noone else can have. Boost its rarity score by equipping wearables and earning XP. Grow your gotchi’s kinship score by interacting with it often. Accumulate badges and trophies that will stay with your gotchi 4ever.',
  tokenStandard: 'ERC721',
  links: {
    discordUrl: 'https://discord.com/invite/cvKUrq-m',
    telegramUrl: 'https://t.me/aavegotchi',
    wikiUrl: 'https://wiki.aavegotchi.com/',
    site: 'https://aavegotchi.com/',
    image:
      'https://lh3.googleusercontent.com/cxerhuM8RvXkcnsGsPhNQ9PzYXvz7MLyEMEeq-o2-7PAL2bBZTELirtNrD7GKx-SwVRGAvNomfE58_oej8sMoHQqjFE55W479GWZZjUQ=s130',
    bannerImage:
      'https://lh3.googleusercontent.com/2qgn-tl_s9atFMpLUqu8XDh2C1t3Kx0IdfLVjMC4f0uIzshcyaWsu9d3kDyEUDK89FydVHIYBTn2OKbpeKBHUh87MwhTgc8OSC9IczA=h600',
  },
  usernames: {
    instagram: 'aavegotchi_official',
    medium: 'aavegotchi',
    twitter: 'aavegotchi',
  },
  displayData: {
    cardDisplayStyle: 'cover',
  },
  chain: ChainIdEnum.plg,
};

export const aavegotchiCollectionEthereum = {
  slug: 'aavegotchi-ethereum',
};
