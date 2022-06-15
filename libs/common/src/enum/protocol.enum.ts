export enum ProjectEnum {
  aave = 'aave',
  abracadabra = 'abracadabra',
  alpaca = 'alpaca',
  anchor = 'anchor',
  terraswap = 'terraswap',
  autofarm = 'autofarm',
  badger = 'badger',
  balancer = 'balancer',
  beefy = 'beefy',
  compound = 'compound',
  convex = 'convex',
  curve = 'curve',
  defikingdoms = 'defikingdoms',
  ellipsis = 'ellipsis',
  mojitoswap = 'mojitoswap',
  olympus = 'olympus',
  pancake = 'pancake',
  pangolin = 'pangolin',
  quickswap = 'quickswap',
  raydium = 'raydium',
  saber = 'saber',
  spookyswap = 'spookyswap',
  sushiswap = 'sushiswap',
  traderjoe = 'traderjoe',
  uniswap = 'uniswap',
  venus = 'venus',
  viperswap = 'viperswap',
  vvs = 'vvs',
  wepiggy = 'wepiggy',
  wonderland = 'wonderland',
  yearn = 'yearn',
  trisolaris = 'trisolaris',
  orca = 'orca',
  sundaeswap = 'sundaeswap',
  astroport = 'astroport',
  mirror = 'mirror',
  marinade = 'marinade',
  stader = 'stader',
  osmosis = 'osmosis',
  aaveV3 = 'aaveV3',
  kava = 'kava',
  solend = 'solend',
  wingriders = 'wingriders',
  ironbank = 'ironbank',
  rocketpool = 'rocketpool',
  quarry = 'quarry',
  muesliswap = 'muesliswap',
  benqi = 'benqi',
}

export enum YearnProtocolEnum {
  YearnV1 = 'YearnV1',
  YearnV2 = 'YearnV2',
}

export enum AbracadabraProtocolEnum {
  abracadabra = 'Abracadabra',
}

export enum BeefyProtocolEnum {
  Beefy = 'Beefy',
}

export enum ConvexProtocolEnum {
  Convex = 'Convex',
}

export enum UniswapProtocolEnum {
  uniswapV1 = 'UniswapV1',
  uniswapV2 = 'UniswapV2',
  uniswapV3 = 'UniswapV3',
}

export enum SushiSwapProtocolEnum {
  sushiswapV1 = 'SushiSwapV1',
  sushiswapV2 = 'SushiSwapV2',
  sushiswapV3 = 'SushiSwapV3',
}

export enum PancakeProtocolEnum {
  pancakeV1 = 'PancakeV1',
  pancakeV2 = 'PancakeV2',
}

export enum AutofarmProtocolEnum {
  autofarm = 'Autofarm',
}

export enum PangolinProtocolEnum {
  pangolin = 'Pangolin',
}

export enum SpookySwapProtocolEnum {
  SpookySwap = 'SpookySwap',
}

export enum QuickswapProtocolEnum {
  quickswap = 'QuickSwap',
}

export enum AlpacaProtocolEnum {
  alpaca = 'Alpaca',
}

export enum CompoundProtocolEnum {
  compound = 'Compound',
}

export enum CurveProtocolEnum {
  curve = 'Curve',
}

export enum TraderjoeProtocolEnum {
  traderjoe = 'TraderJoe',
}

export enum EllipsisProtocolEnum {
  ellipsis = 'Ellipsis',
}

export enum RaydiumProtocolEnum {
  raydium = 'Raydium',
}

export enum ViperswapProtocolEnum {
  viperswap = 'Viperswap',
}

export enum BadgerProtocolEnum {
  badger = 'BadgerDAO',
}

export enum DefiKingdomsProtocolEnum {
  defikingdoms = 'DefiKingdoms',
}

export enum VenusProtocolEnum {
  venus = 'Venus',
}

export enum VVSProtocolEnum {
  vvs = 'VVS',
}

export enum MojitoswapProtocolEnum {
  mojitoswap = 'Mojitoswap',
}

export enum WePiggyProtocolEnum {
  wepiggy = 'WePiggy',
}

export enum WonderlandProtocolEnum {
  wonderland = 'Wonderland',
}

export enum AnchorProtocolEnum {
  anchor = 'Anchor',
}

export enum MirrorProtocolEnum {
  mirror = 'Mirror',
}

export enum TerraswapProtocolEnum {
  terraswap = 'Terraswap',
}

export enum SaberProtocolEnum {
  saber = 'Saber',
}

export enum OlympusProtocolEnum {
  olympus = 'Olympus',
}

export enum TrisolarisProtocolEnum {
  trisolaris = 'Trisolaris',
}

export enum OrcaProtocolEnum {
  orca = 'Orca',
}
export enum SundaeProtocolEnum {
  sundaeswap = 'SundaeSwap',
}

export enum AstroportProtocolEnum {
  astroport = 'Astroport',
}

export enum MarinadeProtocolEnum {
  marinade = 'Marinade',
}

export enum StaderProtocolEnum {
  stader = 'Stader',
}

export enum OsmosisProtocolEnum {
  osmosis = 'Osmosis',
}

export enum AaveV3ProtocolEnum {
  aaveV3 = 'AaveV3',
}

export enum WingRidersProtocolEnum {
  wingriders = 'WingRiders',
}

// V3 Protocols can just be inlined here as they are _only_ used in the swagger docs
// if unsure if it should be in v3 protocolEnum or v2 protocolEnum, put it in v2
export const ProtocolV3NameEnum = {
  AaveV2: 'AaveV2',
  AaveV3: 'AaveV3',
  AlchemixV2: 'AlchemixV2',
  ApeSwap: 'ApeSwap',
  BabySwap: 'BabySwap',
  BalancerV2: 'BalancerV2',
  Bancor: 'Bancor',
  Belt: 'Belt',
  Benqi: 'Benqi',
  Biswap: 'BiSwap',
  Blizz: 'Blizz',
  CafeSwap: 'CafeSwap',
  CheescakeSwap: 'CheescakeSwap',
  CherrySwap: 'CherrySwap',
  CryptoComDefiSwap: 'CryptoComDefiSwap',
  CubFinance: 'CubFinance',
  DfynNetwork: 'DfynNetwork',
  Ellipsis: 'Ellipsis',
  EvoDefi: 'EvoDefi',
  Frax: 'Frax',
  Geist: 'Geist',
  Goose: 'Goose',
  IronBank: 'IronBank',
  Kava: 'Kava',
  Knightswap: 'KnightSwap',
  KyberSwap: 'KyberSwap',
  Lido: 'Lido',
  Liquity: 'Liquity',
  MakerDAO: 'MakerDAO',
  MarsEcosystem: 'MarsEcosystem',
  Mdex: 'Mdex',
  Mojitoswap: 'Mojitoswap',
  MuesliSwap: 'MuesliSwap',
  Nereus: 'Nereus',
  Netswap: 'Netswap',
  PaintSwap: 'PaintSwap',
  Quarry: 'Quarry',
  RocketPool: 'RocketPool',
  RuneFarm: 'RuneFarm',
  SpiritSwap: 'SpiritSwap',
  TombFinance: 'TombFinance',
  Solend: 'Solend',
  Stargate: 'Stargate',
  Synapse: 'Synapse',
  YelFinance: 'YelFinance',
  YetiFinance: 'YetiFinance',
  MinSwap: 'MinSwap',
};

export const ProtocolNameEnum = {
  ...AbracadabraProtocolEnum,
  ...AlpacaProtocolEnum,
  ...AnchorProtocolEnum,
  ...AstroportProtocolEnum,
  ...AutofarmProtocolEnum,
  ...BadgerProtocolEnum,
  ...BeefyProtocolEnum,
  ...CompoundProtocolEnum,
  ...ConvexProtocolEnum,
  ...CurveProtocolEnum,
  ...DefiKingdomsProtocolEnum,
  ...EllipsisProtocolEnum,
  ...MarinadeProtocolEnum,
  ...MirrorProtocolEnum,
  ...MojitoswapProtocolEnum,
  ...OlympusProtocolEnum,
  ...OrcaProtocolEnum,
  ...OsmosisProtocolEnum,
  ...PancakeProtocolEnum,
  ...PangolinProtocolEnum,
  ...QuickswapProtocolEnum,
  ...RaydiumProtocolEnum,
  ...SaberProtocolEnum,
  ...SpookySwapProtocolEnum,
  ...StaderProtocolEnum,
  ...SundaeProtocolEnum,
  ...SushiSwapProtocolEnum,
  ...TerraswapProtocolEnum,
  ...TraderjoeProtocolEnum,
  ...TrisolarisProtocolEnum,
  ...UniswapProtocolEnum,
  ...VVSProtocolEnum,
  ...VenusProtocolEnum,
  ...ViperswapProtocolEnum,
  ...WePiggyProtocolEnum,
  ...WingRidersProtocolEnum,
  ...WonderlandProtocolEnum,
  ...YearnProtocolEnum,

  // V3 Protocols can just be inlined here as they are _only_ used in the swagger docs
  ...ProtocolV3NameEnum,
};
