enum settStrategies {
  bslpibBTCWbtc = '0xDed61Bd8a8c90596D8A6Cf0e678dA04036146963',
  bqlpUsdcWbtc = '0x809990849D53a5109e0cb9C446137793B9f6f1Eb',
  bcrvRenBTC = '0xF8F02D0d41C79a1973f65A440C98acAc7eAA8Dc1',
  bcrvTricrypto = '0xDb0C3118ef1acA6125200139BEaCc5D675F37c9C',
}

enum settVaults {
  bslpibBTCWbtc = '0xEa8567d84E3e54B32176418B4e0C736b56378961',
  bqlpUsdcWbtc = '0x6B2d4c4bb50274c5D4986Ff678cC971c0260E967',
  bcrvRenBTC = '0x7B6bfB88904e4B3A6d239d5Ed8adF557B22C10FC',
  bcrvTricrypto = '0x85E1cACAe9a63429394d68Db59E14af74143c61c',
}

const crvPools = {
  bcrvTricrypto: '0x751B1e21756bDbc307CBcC5085c042a0e9AaEf36',
  bcrvRenBTC: '0xC2d95EEF97Ec6C17551d45e77B590dc1F9117C67',
}

const stakingKeys = ['bslpibBTCWbtc', 'bqlpUsdcWbtc', 'bcrvRenBTC', 'bcrvTricrypto'];

export default { 
  settStrategies, 
  settVaults, 
  crvPools, 
  stakingKeys,
};