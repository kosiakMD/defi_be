enum settStrategies {
  bslpWbtcEth = '0xA6827f0f14D0B83dB925B616d820434697328c22',
  bslpSushiWeth = '0x86f772C82914f5bFD168f99e208d0FC2C371e9C2',
  bcrvRenBTC = '0x4C5d19Da5EaeC298B79879a5f7481bEDE055F4F8',
  bcrvTricrypto = '0xE83A790fC3B7132fb8d7f8d438Bc5139995BF5f4',
  bdxsSwaprWeth = '0x85386C3cE0679b035a9F8F17f531C076d0b35954',
  bdxsWbtcWeth = '0x43942cEae98CC7485B48a37fBB1aa5035e1c8B46',
  bdxsBadgerWeth = '0x22F340C2604Dc1cDBe26caC5838Ea9EBC8862a46',
  bdxsIbbtcWeth = '0x4AeC063BB5322c9d4c1f46572f432aaE3b78b87c',
}

enum settVaults {
  bslpWbtcEth = '0xFc13209cAfE8fb3bb5fbD929eC9F11a39e8Ac041',
  bslpSushiWeth = '0xe774D1FB3133b037AA17D39165b8F45f444f632d',
  bcrvRenBTC = '0xBA418CDdd91111F5c1D1Ac2777Fa8CEa28D71843',
  bcrvTricrypto = '0x4591890225394BF66044347653e112621AF7DDeb',
  bdxsSwaprWeth = '0x0c2153e8aE4DB8233c61717cDC4c75630E952561',
  bdxsWbtcWeth = '0xaf9aB64F568149361ab670372b16661f4380e80B',
  bdxsBadgerWeth = '0xE9C12F06F8AFFD8719263FE4a81671453220389c',
  bdxsIbbtcWeth = '0x60129b2b762952dfe8b21f40ee8aa3b2a4623546',
}

const crvPools = {
  bcrvTricrypto: '0x960ea3e3C7FB317332d990873d354E18d7645590',
  bcrvRenBTC: '0x3E01dD8a5E1fb3481F0F589056b428Fc308AF0Fb',
}

const stakingKeys = ['bslpWbtcEth', 'bslpSushiWeth', 'bcrvRenBTC', 'bcrvTricrypto', 'bdxsSwaprWeth', 
  'bdxsWbtcWeth', 'bdxsBadgerWeth', 'bdxsIbbtcWeth'
];

export default { 
  settStrategies, 
  settVaults, 
  crvPools, 
  stakingKeys,
};