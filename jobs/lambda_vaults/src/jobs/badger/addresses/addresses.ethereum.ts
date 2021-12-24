enum rewards {
  DIGG = '0x798D1bE841a82a273720CE31c822C61a67a601C3',
  cvxCRV = '0x62B9c7356A2Dc64a1969e19C23e4f579F9810Aa7',
  CVX = '0x4e3FBD56CD56c3e72c1403e103b45Db9da5B9D2B',
  BADGER = '0x3472A5A71965499acd81997a54BBA8D852C6E53d',
  MTA = '0xa3bed4e1c75d00fa6f4e5e6922db7261b5e9acd2',
  CRV = '0xD533a949740bb3306d119CC777fa900bA034cd52',
  SUSHI = '0x6b3595068778dd592e39a122f4f5a5cf09c90fe2',
}

const crvPools = {
  bcrvRenBTC: '0x93054188d876f558f4a66B2EF1d97d16eDf0895B',
  bcrvSBTC: '0x7fC77b5c7614E1533320Ea6DDc2Eb61fa00A9714',
  bcrvTBTC: '0xc25099792e9349c7dd09759744ea681c7de2cb66',
  bcrvHBTC: '0x4CA9b3063Ec5866A4B82E437059D2C43d1be596F',
  bcrvBBTC: '0x071c661B4DeefB59E2a3DdB20Db036821eeE8F4b',
  bcrvOBTC: '0xd81dA8D904b52208541Bade1bD6595D8a251F8dd',
  bcrvPBTC: '0x7F55DDe206dbAD629C080068923b36fe9D6bDBeF',
  bcrvIbBTC: '0xFbdCA68601f835b27790D98bbb8eC7f05FDEaA9B',
  bcrvTricrypto: '0xD51a44d3FaE010294C616388b506AcdA1bfAAE46',
  bcrvTricrypto2: '0xD51a44d3FaE010294C616388b506AcdA1bfAAE46',
  bbveCVX: '0x04c90C198b2eFF55716079bc06d7CCc4aa4d7512',
}

const sushiPools = {
  bslpWbtcibBTC: '0x18d98D452072Ac2EB7b74ce3DB723374360539f1',
  bslpWbtcBadger: '0x110492b31c59716AC47337E616804E3E3AdC0b4a',
  bslpWbtcDigg: '0x9a13867048e01c663ce8Ce2fE0cDAE69Ff9F35E3',
  bslpWbtcEth: '0xCEfF51756c56CeFFCA006cD410B03FFC46dd3a58',
  buniWbtcBadger: '0xcD7989894bc033581532D2cd88Da5db0A4b12859',
}

const vaultToReward = {
  bDIGG: rewards.DIGG, 
  bcrvRenBTC: rewards.cvxCRV, 
  bcrvSBTC: rewards.cvxCRV, 
  bcrvTBTC: rewards.cvxCRV, 
  buniWbtcBadger: rewards.BADGER, 
  bslpWbtcBadger: rewards.SUSHI, 
  bslpWbtcibBTC: rewards.SUSHI, 
  bslpWbtcDigg: rewards.SUSHI, 
  bslpWbtcEth: rewards.SUSHI, 
  bcrvHBTC: rewards.cvxCRV, 
  bcrvPBTC: rewards.cvxCRV, 
  bcrvOBTC: rewards.cvxCRV, 
  bcrvBBTC: rewards.cvxCRV, 
  bcrvIbBTC: rewards.cvxCRV, 
  bcrvTricrypto: rewards.cvxCRV, 
  bcrvTricrypto2: rewards.cvxCRV,
  bcvxCRV: rewards.cvxCRV, 
  bCVX: rewards.cvxCRV, 
  bveCVX: rewards.cvxCRV, 
  bimBTC: rewards.MTA, 
  bFpMbtcHbtc: rewards.MTA, 
  bbveCVX: rewards.CRV, 
}

enum settStrategies {
  bDIGG = '0x4a8651F2edD68850B944AD93f2c67af817F39F62', 
  bcrvRenBTC = '0x61e16b46F74aEd8f9c2Ec6CB2dCb2258Bdfc7071', 
  bcrvSBTC = '0xCce0D2d1Eb2310F7e67e128bcFE3CE870A3D3a3d', 
  bcrvTBTC = '0xAB73Ec65a1Ef5a2e5b56D5d6F36Bee4B2A1D3FFb', 
  buniWbtcBadger = '0x95826C65EB1f2d2F0EDBb7EcB176563B61C60bBf', 
  bslpWbtcBadger = '0x3a494D79AA78118795daad8AeFF5825C6c8dF7F1', 
  bslpWbtcibBTC = '0xf4146A176b09C664978e03d28d07Db4431525dAd', 
  bslpWbtcDigg = '0xaa8dddfe7DFA3C3269f1910d89E4413dD006D08a', 
  bslpWbtcEth = '0x7A56d65254705B4Def63c68488C0182968C452ce', 
  bcrvHBTC = '0x8c26D9B6B80684CC642ED9eb1Ac1729Af3E819eE', 
  bcrvPBTC = '0xA9A646668Df5Cec5344941646F5c6b269551e53D', 
  bcrvOBTC = '0x5dd69c6D81f0a403c03b99C5a44Ef2D49b66d388', 
  bcrvBBTC = '0xF2F3AB09E2D8986fBECbBa59aE838a5418a6680c', 
  bcrvIbBTC = '0x6D4BA00Fd7BB73b5aa5b3D6180c6f1B0c89f70D1', 
  bcrvTricrypto = '0x05ec4356e1acd89cc2d16adc7415c8c95e736ac1', 
  bcrvTricrypto2 = '0x647eeb5C5ED5A71621183f09F6CE8fa66b96827d', 
  bcvxCRV = '0x826048381d65a65DAa51342C51d464428d301896',
  bCVX = '0xBCee2c6CfA7A4e29892c3665f464Be5536F16D95', 
  bveCVX = '0x3ff634ce65cDb8CC0D569D6d1697c41aa666cEA9', 
  bimBTC = '0xd409C506742b7f76f164909025Ab29A47e06d30A', 
  bFpMbtcHbtc = '0x54D06A0E1cE55a7a60Ee175AbCeaC7e363f603f3', 
  bbveCVX = '0x98Ca7AFa876f0e15494E76E92C5b3658cdE1Ffe1', 
}

enum settVaults {
  bDIGG = '0x7e7E112A68d8D2E221E11047a72fFC1065c38e1a',
  bcrvRenBTC = '0x6dEf55d2e18486B9dDfaA075bc4e4EE0B28c1545',
  bcrvSBTC = '0xd04c48A53c111300aD41190D63681ed3dAd998eC',
  bcrvTBTC = '0xb9D076fDe463dbc9f915E5392F807315Bf940334',
  buniWbtcBadger = '0x235c9e24D3FB2FAFd58a2E49D454Fdcd2DBf7FF1',
  bslpWbtcBadger = '0x1862A18181346EBd9EdAf800804f89190DeF24a5',
  bslpWbtcibBTC = '0x8a8FFec8f4A0C8c9585Da95D9D97e8Cd6de273DE',
  bslpWbtcDigg = '0x88128580ACdD9c04Ce47AFcE196875747bF2A9f6',
  bslpWbtcEth = '0x758A43EE2BFf8230eeb784879CdcFF4828F2544D',
  bcrvHBTC = '0x8c76970747afd5398e958bdfada4cf0b9fca16c4',
  bcrvPBTC = '0x55912d0cf83b75c492e761932abc4db4a5cb1b17',
  bcrvOBTC = '0xf349c0faa80fc1870306ac093f75934078e28991',
  bcrvBBTC = '0x5dce29e92b1b939f8e8c60dcf15bde82a85be4a9',
  bcrvIbBTC = '0xaE96fF08771a109dc6650a1BdCa62F2d558E40af',
  bcrvTricrypto = '0xBE08Ef12e4a553666291E9fFC24fCCFd354F2Dd2',
  bcrvTricrypto2 = '0x27E98fC7d05f54E544d16F58C194C2D7ba71e3B5',
  bcvxCRV = '0x2B5455aac8d64C14786c3a29858E43b5945819C0',
  bCVX = '0x53c8e199eb2cb7c01543c137078a038937a68e40',
  bveCVX = '0xfd05D3C7fe2924020620A8bE4961bBaA747e6305',
  bimBTC = '0x599D92B453C010b1050d31C364f6ee17E819f193',
  bFpMbtcHbtc = '0x26B8efa69603537AC8ab55768b6740b67664D518',
  bbveCVX = '0x937B8E917d0F36eDEBBA8E459C5FB16F3b315551',
}

enum tokens {
  imBTC = '0x17d8cbb6bce8cee970a4027d1198f6700a7a6c24',
  ibBTC = '0x8751d4196027d4e6da63716fa7786b5174f04c15',
  wBTC = '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599',
}

const stakingKeys = ['bDIGG', 'bcrvRenBTC', 'bcrvSBTC', 'bcrvTBTC', 'buniWbtcBadger', 'bslpWbtcBadger', 'bslpWbtcibBTC', 
  'bslpWbtcDigg', 'bslpWbtcEth', 'bcrvHBTC', 'bcrvPBTC', 'bcrvOBTC', 'bcrvBBTC', 'bcrvIbBTC', 
  'bcrvTricrypto', 'bcrvTricrypto2', 'bcvxCRV', 'bCVX', 'bveCVX', 'bimBTC', 'bFpMbtcHbtc', 'bbveCVX'
];

export default { 
  settStrategies, 
  settVaults, 
  vaultToReward, 
  crvPools, 
  sushiPools, 
  stakingKeys, 
  rewards,
  tokens,
};