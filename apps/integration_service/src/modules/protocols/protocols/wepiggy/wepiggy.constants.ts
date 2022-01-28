export const wpcAddress = '0x6f620ec89b8479e97a6985792d0c64f237566746';

export const contracts = {
  polygon: {
    comptroller: '0xffceacfd39117030314a07b2c86da36e51787948',
    lens: '0x82413f75f0DA101e0FE7F6FF6cBa3461F7e04f29',
    distribution: '0x16b321C99Ab31A84D565ea484F035693718c3E71',
    oracle: '0x4C78015679FabE22F6e02Ce8102AFbF7d93794eA',
  },
  ethereum: {
    comptroller: '0x0c8c1ab017c3c0c8a48dd9f1db2f59022d190f0b',
    lens: '0x6a05BD123d780055c38526cC05d3c9B90D0E471c',
    distribution: '0x3e5496E50793E72e6143a15Bed1c2535F0B0b9b0',
    oracle: '0xe212829Ca055eD63279753971672c693C6C6d088',
  },
  okex: {
    comptroller: '0xaa87715e858b482931eb2f6f92e504571588390b',
    lens: '0x26E489cc791DF2BC09A280937CdcC546c246be50',
    distribution: '0x3ec77d16a5dbfbf2e22be99a4533fa4333343a3b',
    oracle: '0x4C78015679FabE22F6e02Ce8102AFbF7d93794eA',
  },
  binance: {
    comptroller: '0x8c925623708a94c7de98a8e83e8200259ff716e0',
    lens: '0xbCD55352B89c5938e8DF544Fda7A835f5eC429B5',
    distribution: '0xE6320460Aca9E4A4385058EEfD7D4D70123fC9c9',
    oracle: '0x4C78015679FabE22F6e02Ce8102AFbF7d93794eA',
  },
  heco: {
    comptroller: '0x3401d01e31bb6defcfc7410c312c0181e19b9dd5',
    lens: '0x959F30F765a44273EcCaA0FAc094160aa7c238E2',
    distribution: '0x8b4397A92D53916f24a8E06777CEf4485281224C',
    oracle: '0x4C78015679FabE22F6e02Ce8102AFbF7d93794eA',
  },
  arbitrum: {
    comptroller: '0xaa87715e858b482931eb2f6f92e504571588390b',
    lens: '0xf4B6d5d432F1C7A9EfC9E0b04acDe479F9FD1f72',
    distribution: '0x77401FF895BDe043d40aae58F98de5698682c12a',
    oracle: '0x04d2944394b70d6e56fcf1CaD3aa6b5a43Ec8A5C',
  },
  optimism: {
    comptroller: '0x896aecb9e73bf21c50855b7874729596d0e511cb',
    lens: '0x3A9CAD689a510A7C410EE1bE17929cdf78efAC8C',
    distribution: '0x3157e0bbDc7E5DEa0f4c33a0Ad7211B9a4FF19Ee',
    oracle: '0xb205d0AeF84C666FBBe441C61DC04fEb844444E6',
  },
  moonriver: {
    comptroller: '0x9a9b2bf1d1c96332c55d0b6acb8c2b441381116d',
    lens: '0x0684Ed97c1Ef124D60BF1b4F5168d79ca257D56E',
    distribution: '0x389844367fFa7660c6d98ae0f792d2473Ad72405',
    oracle: '0xb205d0AeF84C666FBBe441C61DC04fEb844444E6',
  },
  harmony: {
    comptroller: '0xaa87715e858b482931eb2f6f92e504571588390b',
    lens: '0xe70ADe95E3D038398eb0ACD17534200b0c87A7c4',
    distribution: '0x1Cda0908EFA7b360875B132e8d3353DE019885C9',
    oracle: '0xb205d0AeF84C666FBBe441C61DC04fEb844444E6',
  },
};

// list of pTokens which have native tokens of the chain as underlying
export const nativePTokens = {
  polygon: '0xc1b02e52e9512519edf99671931772e452fb4399',
  ethereum: '0x27a94869341838d5783368a8503fda5fbcd7987c',
  okex: '0x621ce6596e0b9ccf635316bfe7fdbc80c3029bec',
  binance: '0x33a32f0ad4aa704e28c93ed8ffa61d50d51622a7',
  heco: '0x0000000000000000000000000000000000000000',
  arbitrum: '0x17933112e9780abd0f27f2b7d9dda9e840d43159',
  optimism: '0x8e1e582879cb8bac6283368e8ede458b63f499a5',
  moonriver: '0x621ce6596e0b9ccf635316bfe7fdbc80c3029bec',
  harmony: '0xd1121ade04ee215524aefbf7f8d45029214d668d',
};

export const zeroAddress = '0x0000000000000000000000000000000000000000';
