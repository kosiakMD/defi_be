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
  minswap = 'minswap',
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

export enum AaveProtocolEnum {
  AaveV2 = 'AaveV2',
}

export enum AbracadabraProtocolEnum {
  abracadabra = 'Abracadabra',
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
export enum MinswapProtocolEnum {
  minswap = 'Minswap',
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

export enum MuesliSwapProtocolEnum {
  muesliswap = 'MuesliSwap',
}

// V3 Protocols can just be inlined here as they are _only_ used in the swagger docs
// if unsure if it should be in v3 protocolEnum or v2 protocolEnum, put it in v2
export const ProtocolV3NameEnum = {
  ...AaveV3ProtocolEnum,
  IronBank: 'IronBank',
  MakerDAO: 'MakerDAO',
  Quarry: 'Quarry',
  RocketPool: 'RocketPool',
  Stargate: 'Stargate',
  Synapse: 'Synapse',
  babySwap: 'BabySwap',
  belt: 'Belt',
  biswap: 'BiSwap',
  frax: 'Frax',
  goose: 'Goose',
  solend: 'Solend',
  kava: 'Kava',
  knightswap: 'KnightSwap',
  lido: 'Lido',
  marsEcosystem: 'MarsEcosystem',
  mdex: 'Mdex',
  yelFinance: 'YelFinance',
  benqi: 'Benqi',
  beefy: 'Beefy',
};

export const ProtocolNameEnum = {
  ...AaveProtocolEnum,
  ...AbracadabraProtocolEnum,
  ...AlpacaProtocolEnum,
  ...AnchorProtocolEnum,
  ...AstroportProtocolEnum,
  ...AutofarmProtocolEnum,
  ...BadgerProtocolEnum,
  ...CompoundProtocolEnum,
  ...ConvexProtocolEnum,
  ...CurveProtocolEnum,
  ...DefiKingdomsProtocolEnum,
  ...EllipsisProtocolEnum,
  ...MarinadeProtocolEnum,
  ...MinswapProtocolEnum,
  ...MirrorProtocolEnum,
  ...MojitoswapProtocolEnum,
  ...MuesliSwapProtocolEnum,
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
  ...ProtocolV3NameEnum,
};
