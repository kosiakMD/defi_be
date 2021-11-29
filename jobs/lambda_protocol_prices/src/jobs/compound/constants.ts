export const tokens = {
  cBAT: '0x6c8c6b02e7b2be14d4fa6022dfd6d75921d90e4e',
  cDAI: '0x5d3a536e4d6dbd6114cc1ead35777bab948e3643',
  cETH: '0x4ddc2d193948926d02f9b1fe9e1daa0718270ed5', // token => 0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2
  cREP: '0x158079ee67fce2f58472a96584a73c7ab9ac95c1',

  // Compound SAI & SAI don't currently work with the price service
  // https://etherscan.io/address/0xf5dce57282a584d2746faf1593d3121fcac444dc
  // https://etherscan.io/address/0x89d24a6b4ccb1b6faa2625fe562bdd9a23260359
  // SAI's name/symbol are bytes32 not strings and cause overflows when
  // attempting to read
  // cSAI: '0xf5dce57282a584d2746faf1593d3121fcac444dc',

  cUSDC: '0x39aa39c021dfbae8fac545936693ac917d5e7563',
  cUSDT: '0xf650c3d88d12db855b8bf7d11be6c55a4e07dcc9',
  cWBTC: '0xc11b1268c1a384e55c48c2391d8d480264a3a7f4',
  cZRX: '0xb3319f5d18bc0d84dd1b4825dcde5d5f7266d407',
};

export const underlying = {
  [tokens.cETH]: '0xc02aaa39b223fe8d0a0e5c4f27ead9083c756cc2',
};
