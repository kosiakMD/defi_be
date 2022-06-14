import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPriceSources1654064257502 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await this.down(queryRunner); //remove existing setup if any
    // --------------------------------------   other types   ------------------------------------- //
    await queryRunner.query(`
        INSERT INTO price_sources (name, type, config, enabled)
        VALUES ('Coingecko', 'coingecko', '${JSON.stringify(
          {
            requestDelay: 1000,
          },
          null,
          2,
        )}', true);
    `);
    await queryRunner.query(`
        INSERT INTO price_sources (name, type, config, enabled)
        VALUES ('Solana Scan', 'solana-scan', '{}', true);
    `);
    await queryRunner.query(`
        INSERT INTO price_sources (name, type, config, enabled)
        VALUES ('SundaeSwap', 'sundaeswap', '{}', true);
    `);
    await queryRunner.query(`
        INSERT INTO price_sources (name, type, config, enabled)
        VALUES ('Debank', 'debank', '{}', true);
    `);

    // -------------------------------------- univ2-subgraph  ------------------------------------- //
    // ---------------------------------- CHAIN: eth = 1 - start  --------------------------------- //
    await queryRunner.query(`
        INSERT INTO price_sources (name, type, config, enabled)
        VALUES ('UniSwap Mainnet', 'univ2-subgraph', '${JSON.stringify(
          {
            chainId: 1,
            subgraphUrl: 'https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v2',
          },
          null,
          2,
        )}', true);
    `);
    await queryRunner.query(`
        INSERT INTO price_sources (name, type, config, enabled)
        VALUES ('SushiSwap Mainnet', 'univ2-subgraph', '${JSON.stringify(
          {
            chainId: 1,
            subgraphUrl: 'https://api.thegraph.com/subgraphs/name/sushiswap/exchange',
            tradeVolumeUSD: 'volumeUSD',
          },
          null,
          2,
        )}', true);
    `);
    // ---------------------------------- CHAIN: eth = 1 - end  --------------------------------- //

    // ---------------------------------- CHAIN: bnb = 2 - start  --------------------------------- //
    await queryRunner.query(`
        INSERT INTO price_sources (name, type, config, enabled)
        VALUES ('SushiSwap Binance', 'univ2-subgraph', '${JSON.stringify(
          {
            chainId: 2,
            subgraphUrl: 'https://api.thegraph.com/subgraphs/name/sushiswap/bsc-exchange',
            tradeVolumeUSD: 'volumeUSD',
          },
          null,
          2,
        )}', true);
    `);
    await queryRunner.query(`
        INSERT INTO price_sources (name, type, config, enabled)
        VALUES ('PancakeSwap', 'univ2-subgraph', '${JSON.stringify(
          {
            chainId: 2,
            subgraphUrl: 'https://bsc.streamingfast.io/subgraphs/name/pancakeswap/exchange-v2',
            coinSymbol: 'BNB',
            maxItems: 3000,
          },
          null,
          2,
        )}', true);
    `);
    // ---------------------------------- CHAIN: bnb = 2 - end  --------------------------------- //

    // ---------------------------------- CHAIN: plg = 3 - start  --------------------------------- //
    await queryRunner.query(`
        INSERT INTO price_sources (name, type, config, enabled)
        VALUES ('SushiSwap Matic', 'univ2-subgraph', '${JSON.stringify(
          {
            chainId: 3,
            subgraphUrl: 'https://api.thegraph.com/subgraphs/name/sushiswap/matic-exchange',
            tradeVolumeUSD: 'volumeUSD',
            wrappedCoin: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270',
            ignoreCoin: true,
          },
          null,
          2,
        )}', true);
    `);
    await queryRunner.query(`
        INSERT INTO price_sources (name, type, config, enabled)
        VALUES ('QuickSwap', 'univ2-subgraph', '${JSON.stringify(
          {
            chainId: 3,
            subgraphUrl: 'https://polygon.furadao.org/subgraphs/name/quickswap',
            wrappedCoin: '0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270',
            ignoreCoin: true,
          },
          null,
          2,
        )}', true);
    `);
    // ---------------------------------- CHAIN: plg = 3 - end  --------------------------------- //

    // ---------------------------------- CHAIN: ftm = 4 - start  --------------------------------- //
    await queryRunner.query(`
        INSERT INTO price_sources (name, type, config, enabled)
        VALUES ('SushiSwap Fantom', 'univ2-subgraph', '${JSON.stringify(
          {
            chainId: 4,
            subgraphUrl: 'https://api.thegraph.com/subgraphs/name/sushiswap/fantom-exchange',
            tradeVolumeUSD: 'volumeUSD',
          },
          null,
          2,
        )}', true);
    `);
    await queryRunner.query(`
        INSERT INTO price_sources (name, type, config, enabled)
        VALUES ('PaintSwap', 'univ2-subgraph', '${JSON.stringify(
          {
            chainId: 4,
            subgraphUrl: 'https://api.thegraph.com/subgraphs/name/paint-swap-finance/exchange',
            coinSymbol: 'FTM',
          },
          null,
          2,
        )}', true);
    `);
    await queryRunner.query(`
        INSERT INTO price_sources (name, type, config, enabled)
        VALUES ('SpookySwap', 'univ2-subgraph', '${JSON.stringify(
          {
            chainId: 4,
            subgraphUrl: 'https://api.thegraph.com/subgraphs/name/eerieeight/spookyswap',
          },
          null,
          2,
        )}', true);
    `);
    await queryRunner.query(`
        INSERT INTO price_sources (name, type, config, enabled)
        VALUES ('SpiritSwap', 'univ2-subgraph', '${JSON.stringify(
          {
            chainId: 4,
            subgraphUrl: 'https://api.thegraph.com/subgraphs/name/layer3org/spiritswap-analytics',
            coinSymbol: 'FTM',
          },
          null,
          2,
        )}', true);
    `);
    // ---------------------------------- CHAIN: ftm = 4 - end  --------------------------------- //

    // ---------------------------------- CHAIN: arbi = 5 - start  --------------------------------- //
    await queryRunner.query(`
        INSERT INTO price_sources (name, type, config, enabled)
        VALUES ('SushiSwap Arbitrum', 'univ2-subgraph', '${JSON.stringify(
          {
            chainId: 5,
            subgraphUrl: 'https://api.thegraph.com/subgraphs/name/sushiswap/arbitrum-exchange',
            tradeVolumeUSD: 'volumeUSD',
          },
          null,
          2,
        )}', true);
    `);
    await queryRunner.query(`
        INSERT INTO price_sources (name, type, config, enabled)
        VALUES ('Swapr Arbitrum One V2', 'univ2-subgraph', '${JSON.stringify(
          {
            chainId: 5,
            subgraphUrl: 'https://api.thegraph.com/subgraphs/name/luzzif/swapr-arbitrum-one-v2',
            priceAlias: 'nativeCurrencyPrice',
            derivedAlias: 'derivedNativeCurrency',
          },
          null,
          2,
        )}', true);
    `);
    // ---------------------------------- CHAIN: arbi = 5 - end  --------------------------------- //

    // ---------------------------------- CHAIN: avax = 6 - start  --------------------------------- //
    await queryRunner.query(`
        INSERT INTO price_sources (name, type, config, enabled)
        VALUES ('SushiSwap Avalanche', 'univ2-subgraph', '${JSON.stringify(
          {
            chainId: 6,
            subgraphUrl: 'https://api.thegraph.com/subgraphs/name/sushiswap/avalanche-exchange',
            tradeVolumeUSD: 'volumeUSD',
          },
          null,
          2,
        )}', true);
    `);
    await queryRunner.query(`
        INSERT INTO price_sources (name, type, config, enabled)
        VALUES ('TraderJoe', 'univ2-subgraph', '${JSON.stringify(
          {
            chainId: 6,
            subgraphUrl: 'https://api.thegraph.com/subgraphs/name/traderjoe-xyz/exchange',
            tradeVolumeUSD: 'volumeUSD',
            coinSymbol: 'AVAX',
          },
          null,
          2,
        )}', true);
    `);
    await queryRunner.query(`
        INSERT INTO price_sources (name, type, config, enabled)
        VALUES ('Pangolin', 'univ2-subgraph', '${JSON.stringify(
          {
            chainId: 6,
            subgraphUrl: 'https://api.thegraph.com/subgraphs/name/pangolindex/exchange',
          },
          null,
          2,
        )}', true);
    `);
    // ---------------------------------- CHAIN: avax = 6 - end  --------------------------------- //

    // ---------------------------------- CHAIN: gnosis = 7 - start  --------------------------------- //
    await queryRunner.query(`
        INSERT INTO price_sources (name, type, config, enabled)
        VALUES ('SushiSwap xDai', 'univ2-subgraph', '${JSON.stringify(
          {
            chainId: 7,
            subgraphUrl: 'https://api.thegraph.com/subgraphs/name/sushiswap/xdai-exchange',
            tradeVolumeUSD: 'volumeUSD',
          },
          null,
          2,
        )}', true);
    `);
    await queryRunner.query(`
        INSERT INTO price_sources (name, type, config, enabled)
        VALUES ('Honeyswap V2', 'univ2-subgraph', '${JSON.stringify(
          {
            chainId: 7,
            subgraphUrl: 'https://api.thegraph.com/subgraphs/name/1hive/honeyswap-v2',
          },
          null,
          2,
        )}', true);
    `);
    await queryRunner.query(`
        INSERT INTO price_sources (name, type, config, enabled)
        VALUES ('Swapr xDai V2', 'univ2-subgraph', '${JSON.stringify(
          {
            chainId: 7,
            subgraphUrl: 'https://api.thegraph.com/subgraphs/name/dxgraphs/swapr-xdai-v2',
            priceAlias: 'nativeCurrencyPrice',
            derivedAlias: 'derivedNativeCurrency',
          },
          null,
          2,
        )}', true);
    `);
    // ---------------------------------- CHAIN: gnosis = 7 - end  --------------------------------- //

    // ---------------------------------- CHAIN: celo = 8 - start  --------------------------------- //
    await queryRunner.query(`
        INSERT INTO price_sources (name, type, config, enabled)
        VALUES ('SushiSwap Celo', 'univ2-subgraph', '${JSON.stringify(
          {
            chainId: 8,
            subgraphUrl: 'https://api.thegraph.com/subgraphs/name/sushiswap/celo-exchange',
            tradeVolumeUSD: 'volumeUSD',
            ignoreCoin: true,
          },
          null,
          2,
        )}', true);
    `);
    await queryRunner.query(`
        INSERT INTO price_sources (name, type, config, enabled)
        VALUES ('UberSwap', 'univ2-subgraph', '${JSON.stringify(
          {
            chainId: 8,
            subgraphUrl: 'https://api.thegraph.com/subgraphs/name/ubeswap/ubeswap',
            coinSymbol: 'CELO',
            derivedAlias: 'derivedCUSD',
          },
          null,
          2,
        )}', true);
    `);
    // ---------------------------------- CHAIN: celo = 8 - end  --------------------------------- //

    // ---------------------------------- CHAIN: mriver = 9 - start  --------------------------------- //
    await queryRunner.query(`
        INSERT INTO price_sources (name, type, config, enabled)
        VALUES ('SolarBeam Moonriver', 'univ2-subgraph', '${JSON.stringify(
          {
            chainId: 9,
            subgraphUrl: 'https://api.thegraph.com/subgraphs/name/solarbeamio/amm-v2',
          },
          null,
          2,
        )}', true);
    `);
    await queryRunner.query(`
        INSERT INTO price_sources (name, type, config, enabled)
        VALUES ('SushiSwap Moonriver', 'univ2-subgraph', '${JSON.stringify(
          {
            chainId: 9,
            subgraphUrl: 'https://api.thegraph.com/subgraphs/name/sushiswap/moonriver-exchange',
            tradeVolumeUSD: 'volumeUSD',
            ignoreCoin: true,
          },
          null,
          2,
        )}', true);
    `);
    // ---------------------------------- CHAIN: mriver = 9 - end  --------------------------------- //

    // ---------------------------------- CHAIN: harm = 10 - start  --------------------------------- //
    await queryRunner.query(`
        INSERT INTO price_sources (name, type, config, enabled)
        VALUES ('SushiSwap Harmony', 'univ2-subgraph', '${JSON.stringify(
          {
            chainId: 10,
            subgraphUrl: 'https://api.thegraph.com/subgraphs/name/sushiswap/harmony-exchange',
            tradeVolumeUSD: 'volumeUSD',
          },
          null,
          2,
        )}', true);
    `);
    await queryRunner.query(`
        INSERT INTO price_sources (name, type, config, enabled)
        VALUES ('ViperSwap', 'univ2-subgraph', '${JSON.stringify(
          {
            chainId: 10,
            subgraphUrl: 'https://graph.viper.exchange/subgraphs/name/venomprotocol/venomswap-v2',
          },
          null,
          2,
        )}', true);
    `);
    // ---------------------------------- CHAIN: harm = 10 - end  --------------------------------- //

    // ---------------------------------- CHAIN: heco = 11 - start  --------------------------------- //
    await queryRunner.query(`
        INSERT INTO price_sources (name, type, config, enabled)
        VALUES ('PippiSwap', 'univ2-network', '${JSON.stringify(
          {
            chainId: 11,
            factory: '0x979efE7cA072b72d6388f415d042951dDF13036e',
            wrappedCoin: '0x5545153CCFcA01fbd7Dd11C0b23ba694D9509A6F',
            stableCoins: [
              '0xa71EdC38d189767582C38A3145b5873052c3e47a',
              '0x9362Bbef4B8313A8Aa9f0c9808B80577Aa26B73B',
              '0x0298c2b32eaE4da002a15f36fdf7615BEa3DA047',
            ],
          },
          null,
          2,
        )}', true);
    `);
    // ---------------------------------- CHAIN: heco = 11 - end  --------------------------------- //

    // ---------------------------------- CHAIN: okex = 13 - start  --------------------------------- //
    await queryRunner.query(`
        INSERT INTO price_sources (name, type, config, enabled)
        VALUES ('KSwap', 'univ2-subgraph', '${JSON.stringify(
          {
            chainId: 13,
            subgraphUrl: 'https://graph.kswap.finance/subgraphs/name/kswap-finance/kswap-subgraph',
          },
          null,
          2,
        )}', true);
    `);
    await queryRunner.query(`
        INSERT INTO price_sources (name, type, config, enabled)
        VALUES ('CherrySwap', 'univ2-subgraph', '${JSON.stringify(
          {
            chainId: 13,
            subgraphUrl: 'https://chart.cherryswap.net/subgraphs/name/swap/cherrysubgraph',
          },
          null,
          2,
        )}', true);
    `);
    // ---------------------------------- CHAIN: okex = 13 - end  --------------------------------- //

    // ---------------------------------- CHAIN: cro = 14 - start  --------------------------------- //
    await queryRunner.query(`
        INSERT INTO price_sources (name, type, config, enabled)
        VALUES ('VSS', 'univ2-subgraph', '${JSON.stringify(
          {
            chainId: 14,
            subgraphUrl: 'https://graph.vvs.finance/exchange',
            coinSymbol: 'CRO',
          },
          null,
          2,
        )}', true);
    `);
    await queryRunner.query(`
        INSERT INTO price_sources (name, type, config, enabled)
        VALUES ('MM Finance', 'univ2-subgraph', '${JSON.stringify(
          {
            chainId: 14,
            subgraphUrl: 'https://graph.mm.finance/subgraphs/name/madmeerkat-finance/exchange',
            coinSymbol: 'CRO',
            priceAlias: 'bnbPrice',
          },
          null,
          2,
        )}', true);
    `);
    // ---------------------------------- CHAIN: cro = 14 - end  --------------------------------- //

    // ---------------------------------- CHAIN: boba = 15 - start  --------------------------------- //
    await queryRunner.query(`
        INSERT INTO price_sources (name, type, config, enabled)
        VALUES ('OolongSwap', 'univ2-subgraph', '${JSON.stringify(
          {
            chainId: 15,
            subgraphUrl: 'https://api.thegraph.com/subgraphs/name/oolongswap/oolongswap-mainnet',
          },
          null,
          2,
        )}', true);
    `);
    // ---------------------------------- CHAIN: boba = 15 - start  --------------------------------- //

    // ---------------------------------- CHAIN: kcc = 16 - start  --------------------------------- //
    await queryRunner.query(`
        INSERT INTO price_sources (name, type, config, enabled)
        VALUES ('KuSwap', 'univ2-subgraph', '${JSON.stringify(
          {
            chainId: 16,
            subgraphUrl: 'https://info.kuswap.finance/subgraphs/name/kuswap/swa',
          },
          null,
          2,
        )}', true);
    `);
    await queryRunner.query(`
        INSERT INTO price_sources (name, type, config, enabled)
        VALUES ('MojitoSwap', 'univ2-subgraph', '${JSON.stringify(
          {
            chainId: 16,
            subgraphUrl: 'https://thegraph.kcc.network/subgraphs/name/mojito/swap',
          },
          null,
          2,
        )}', true);
    `);
    // ---------------------------------- CHAIN: kcc = 16 - start  --------------------------------- //

    // ---------------------------------- CHAIN: opt = 17 - start  --------------------------------- //
    await queryRunner.query(`
        INSERT INTO price_sources (name, type, config, enabled)
        VALUES ('UniSwap V3 Optimism', 'univ2-subgraph', '${JSON.stringify(
          {
            chainId: 17,
            subgraphUrl:
              'https://api.thegraph.com/subgraphs/name/ianlapham/optimism-post-regenesis',
            priceAlias: 'ethPriceUSD',
            tradeVolumeUSD: 'volumeUSD',
          },
          null,
          2,
        )}', true);
    `);
    await queryRunner.query(`
        INSERT INTO price_sources (name, type, config, enabled)
        VALUES ('ZipSwap Optimism', 'univ2-subgraph', '${JSON.stringify(
          {
            chainId: 17,
            subgraphUrl: 'https://api.thegraph.com/subgraphs/name/nonamefits/zipswap',
          },
          null,
          2,
        )}', true);
    `);
    // ---------------------------------- CHAIN: opt = 17 - end  --------------------------------- //

    // ---------------------------------- CHAIN: aurora = 18 - start  --------------------------------- //
    await queryRunner.query(`
        INSERT INTO price_sources (name, type, config, enabled)
        VALUES ('Trisolaris', 'univ2-network', '${JSON.stringify(
          {
            chainId: 18,
            factory: '0xc66F594268041dB60507F00703b152492fb176E7',
            wrappedCoin: '0xC9BdeEd33CD01541e1eeD10f90519d2C06Fe3feB',
            stableCoins: [
              '0x4988a896b1227218e4A686fdE5EabdcAbd91571f',
              '0xB12BFcA5A55806AaF64E99521918A4bf0fC40802',
              '0xe3520349F477A5F6EB06107066048508498A291b',
            ],
            minCap: 500,
          },
          null,
          2,
        )}', true);
    `);
    await queryRunner.query(`
        INSERT INTO price_sources (name, type, config, enabled)
        VALUES ('WannaSwap', 'univ2-network', '${JSON.stringify(
          {
            chainId: 18,
            factory: '0x7928D4FeA7b2c90C732c10aFF59cf403f0C38246',
            wrappedCoin: '0xC9BdeEd33CD01541e1eeD10f90519d2C06Fe3feB',
            stableCoins: [
              '0x4988a896b1227218e4A686fdE5EabdcAbd91571f',
              '0xB12BFcA5A55806AaF64E99521918A4bf0fC40802',
              '0xe3520349F477A5F6EB06107066048508498A291b',
            ],
            minCap: 500,
          },
          null,
          2,
        )}', true);
    `);
    // ---------------------------------- CHAIN: aurora = 18 - end  --------------------------------- //

    // ---------------------------------- CHAIN: klay = 20 - start  --------------------------------- //
    // TODO: Add KlaySwap (not UNIV2 fork) https://docs.klayswap.com/developers/contract/exchange

    await queryRunner.query(`
        INSERT INTO price_sources (name, type, config, enabled)
        VALUES ('ClaimSwap', 'univ2-network', '${JSON.stringify(
          {
            chainId: 20,
            factory: '0x3679c3766E70133Ee4A7eb76031E49d3d1f2B50c',
            wrappedCoin: '0x754288077D0fF82AF7a5317C7CB8c444D421d103',
            stableCoins: [
              '0x5c74070FDeA071359b86082bd9f9b3dEaafbe32b',
              '0xceE8FAF64bB97a73bb51E115Aa89C17FfA8dD167',
              '0x210bC03f49052169D5588A52C317f71cF2078b85',
              '0x754288077D0fF82AF7a5317C7CB8c444D421d103',
            ],
            minCap: 500,
          },
          null,
          2,
        )}', true);
    `);
    // ---------------------------------- CHAIN: klay = 20 - end  --------------------------------- //

    // ---------------------------------- CHAIN: fuse = 21 - start  --------------------------------- //
    await queryRunner.query(`
        INSERT INTO price_sources (name, type, config, enabled)
        VALUES ('SushiSwap Fuse', 'univ2-subgraph', '${JSON.stringify(
          {
            chainId: 21,
            subgraphUrl: 'https://api.thegraph.com/subgraphs/name/sushiswap/fuse-exchange',
            tradeVolumeUSD: 'volumeUSD',
          },
          null,
          2,
        )}', true);
    `);
    await queryRunner.query(`
        INSERT INTO price_sources (name, type, config, enabled)
        VALUES ('Voltage', 'univ2-subgraph', '${JSON.stringify(
          {
            chainId: 21,
            subgraphUrl: 'https://api.thegraph.com/subgraphs/name/voltfinance/voltage-exchange',
          },
          null,
          2,
        )}', true);
    `);
    // ---------------------------------- CHAIN: fuse = 21 - end  --------------------------------- //

    // ---------------------------------- CHAIN: metis = 23 - start  --------------------------------- //
    await queryRunner.query(`
        INSERT INTO price_sources (name, type, config, enabled)
        VALUES ('NetSwap', 'univ2-subgraph', '${JSON.stringify(
          {
            chainId: 23,
            subgraphUrl: 'https://api.netswap.io/graph/subgraphs/name/netswap/exchange',
            coinSymbol: 'METIS',
          },
          null,
          2,
        )}', true);
    `);
    await queryRunner.query(`
        INSERT INTO price_sources (name, type, config, enabled)
        VALUES ('Tethys', 'univ2-subgraph', '${JSON.stringify(
          {
            chainId: 23,
            subgraphUrl: 'https://node.tethys.finance/subgraphs/name/tethys',
          },
          null,
          2,
        )}', true);
    `);
    // ---------------------------------- CHAIN: metis = 23 - end  --------------------------------- //

    // ---------------------------------- CHAIN: ronin = 24 - start  --------------------------------- //
    await queryRunner.query(`
        INSERT INTO price_sources (name, type, config, enabled)
        VALUES ('Katana', 'univ2-subgraph', '${JSON.stringify(
          {
            chainId: 24,
            subgraphUrl:
              'https://thegraph.roninchain.com/subgraphs/name/axieinfinity/katana-subgraph-blue',
            ignoreCoin: true,
          },
          null,
          2,
        )}', true);
    `);
    // ---------------------------------- CHAIN: ronin = 24 - end  --------------------------------- //

    // ---------------------------------- CHAIN: iotex = 29 - start  --------------------------------- //
    await queryRunner.query(`
        INSERT INTO price_sources (name, type, config, enabled)
        VALUES ('Mimo', 'univ2-network', '${JSON.stringify(
          {
            chainId: 29,
            factory: '0xda257cBe968202Dea212bBB65aB49f174Da58b9D',
            wrappedCoin: '0xA00744882684C3e4747faEFD68D283eA44099D03',
            stableCoins: [
              '0xC04DA3a99D17135857BB937d2Fbb321d3B6c6a81',
              '0x3CDb7c48E70B854ED2Fa392E21687501D84B3AFc',
              '0x1CbAd85Aa66Ff3C12dc84C5881886EEB29C1bb9b',
            ],
            minCap: 1000,
          },
          null,
          2,
        )}', true);
    `);
    // ---------------------------------- CHAIN: iotex = 29 - end  --------------------------------- //

    // ---------------------------------- CHAIN: milkomeda = 30 - start  --------------------------------- //
    await queryRunner.query(`
        INSERT INTO price_sources (name, type, config, enabled)
        VALUES ('MuesliSwap', 'univ2-network', '${JSON.stringify(
          {
            chainId: 30,
            factory: '0x57A8C24B2B0707478f91D3233A264eD77149D408',
            wrappedCoin: '0xAE83571000aF4499798d1e3b0fA0070EB3A3E3F9',
            stableCoins: [
              '0xB44a9B6905aF7c801311e8F4E76932ee959c663C',
              '0x80A16016cC4A2E6a2CACA8a4a498b1699fF0f844',
              '0x6a2d262D56735DbA19Dd70682B39F6bE9a931D98',
              '0x639A647fbe20b6c8ac19E48E2de44ea792c62c5C',
            ],
          },
          null,
          2,
        )}', true);
    `);
    await queryRunner.query(`
        INSERT INTO price_sources (name, type, config, enabled)
        VALUES ('MilkySwap', 'univ2-network', '${JSON.stringify(
          {
            chainId: 30,
            factory: '0xD6Ab33Ad975b39A8cc981bBc4Aaf61F957A5aD29',
            wrappedCoin: '0xAE83571000aF4499798d1e3b0fA0070EB3A3E3F9',
            stableCoins: [
              '0xB44a9B6905aF7c801311e8F4E76932ee959c663C',
              '0x80A16016cC4A2E6a2CACA8a4a498b1699fF0f844',
              '0x6a2d262D56735DbA19Dd70682B39F6bE9a931D98',
              '0x639A647fbe20b6c8ac19E48E2de44ea792c62c5C',
            ],
          },
          null,
          2,
        )}', true);
    `);
    // ---------------------------------- CHAIN: milkomeda = 30 - end  --------------------------------- //
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // --------------------------------------   other types   ------------------------------------- //
    await queryRunner.query(`DELETE FROM price_sources WHERE name = 'Coingecko';`);
    await queryRunner.query(`DELETE FROM price_sources WHERE name = 'Solana Scan';`);
    await queryRunner.query(`DELETE FROM price_sources WHERE name = 'SundaeSwap';`);
    await queryRunner.query(`DELETE FROM price_sources WHERE name = 'Debank';`);

    // -------------------------------------- univ2-subgraph  ------------------------------------- //
    // ---------------------------------- CHAIN: eth = 1 - start  --------------------------------- //
    await queryRunner.query(`DELETE FROM price_sources WHERE name = 'UniSwap Mainnet';`);
    await queryRunner.query(`DELETE FROM price_sources WHERE name = 'SushiSwap Mainnet';`);
    // ---------------------------------- CHAIN: eth = 1 - end  --------------------------------- //

    // ---------------------------------- CHAIN: bnb = 2 - start  --------------------------------- //
    await queryRunner.query(`DELETE FROM price_sources WHERE name = 'SushiSwap Binance';`);
    await queryRunner.query(`DELETE FROM price_sources WHERE name = 'PancakeSwap';`);
    // ---------------------------------- CHAIN: bnb = 2 - end  --------------------------------- //

    // ---------------------------------- CHAIN: plg = 3 - start  --------------------------------- //
    await queryRunner.query(`DELETE FROM price_sources WHERE name = 'SushiSwap Matic';`);
    await queryRunner.query(`DELETE FROM price_sources WHERE name = 'QuickSwap';`);
    // ---------------------------------- CHAIN: plg = 3 - end  --------------------------------- //

    // ---------------------------------- CHAIN: ftm = 4 - start  --------------------------------- //
    await queryRunner.query(`DELETE FROM price_sources WHERE name = 'SushiSwap Fantom';`);
    await queryRunner.query(`DELETE FROM price_sources WHERE name = 'PaintSwap';`);
    await queryRunner.query(`DELETE FROM price_sources WHERE name = 'SpookySwap';`);
    await queryRunner.query(`DELETE FROM price_sources WHERE name = 'SpiritSwap';`);
    // ---------------------------------- CHAIN: ftm = 4 - end  --------------------------------- //

    // ---------------------------------- CHAIN: arbi = 5 - start  --------------------------------- //
    await queryRunner.query(`DELETE FROM price_sources WHERE name = 'SushiSwap Arbitrum';`);
    await queryRunner.query(`DELETE FROM price_sources WHERE name = 'Swapr Arbitrum One V2';`);
    // ---------------------------------- CHAIN: arbi = 5 - end  --------------------------------- //

    // ---------------------------------- CHAIN: avax = 6 - start  --------------------------------- //
    await queryRunner.query(`DELETE FROM price_sources WHERE name = 'SushiSwap Avalanche';`);
    await queryRunner.query(`DELETE FROM price_sources WHERE name = 'TraderJoe';`);
    await queryRunner.query(`DELETE FROM price_sources WHERE name = 'Pangolin';`);
    // ---------------------------------- CHAIN: avax = 6 - end  --------------------------------- //

    // ---------------------------------- CHAIN: gnosis = 7 - start  --------------------------------- //
    await queryRunner.query(`DELETE FROM price_sources WHERE name = 'Sushiswap xDai';`);
    await queryRunner.query(`DELETE FROM price_sources WHERE name = 'Honeyswap V2';`);
    await queryRunner.query(`DELETE FROM price_sources WHERE name = 'Swapr xDai V2';`);
    // ---------------------------------- CHAIN: gnosis = 7 - end  --------------------------------- //

    // ---------------------------------- CHAIN: celo = 8 - start  --------------------------------- //
    await queryRunner.query(`DELETE FROM price_sources WHERE name = 'SushiSwap Celo';`);
    await queryRunner.query(`DELETE FROM price_sources WHERE name = 'UberSwap';`);
    // ---------------------------------- CHAIN: celo = 8 - end  --------------------------------- //

    // ---------------------------------- CHAIN: mriver = 9 - start  --------------------------------- //
    await queryRunner.query(`DELETE FROM price_sources WHERE name = 'SolarBeam Moonriver';`);
    await queryRunner.query(`DELETE FROM price_sources WHERE name = 'SushiSwap Moonriver';`);
    // ---------------------------------- CHAIN: mriver = 9 - end  --------------------------------- //

    // ---------------------------------- CHAIN: harm = 10 - start  --------------------------------- //
    await queryRunner.query(`DELETE FROM price_sources WHERE name = 'SushiSwap Harmony';`);
    await queryRunner.query(`DELETE FROM price_sources WHERE name = 'ViperSwap';`);
    // ---------------------------------- CHAIN: harm = 10 - end  --------------------------------- //

    // ---------------------------------- CHAIN: heco = 11 - start  --------------------------------- //
    await queryRunner.query(`DELETE FROM price_sources WHERE name = 'PippiSwap';`);
    // ---------------------------------- CHAIN: heco = 11 - end  --------------------------------- //

    // ---------------------------------- CHAIN: okex = 13 - start  --------------------------------- //
    await queryRunner.query(`DELETE FROM price_sources WHERE name = 'CherrySwap';`);
    await queryRunner.query(`DELETE FROM price_sources WHERE name = 'KSwap';`);
    // ---------------------------------- CHAIN: okex = 13 - end  --------------------------------- //

    // ---------------------------------- CHAIN: cro = 14 - start  --------------------------------- //
    await queryRunner.query(`DELETE FROM price_sources WHERE name = 'VSS';`);
    await queryRunner.query(`DELETE FROM price_sources WHERE name = 'MM Finance';`);
    // ---------------------------------- CHAIN: cro = 14 - end  --------------------------------- //

    // ---------------------------------- CHAIN: boba = 15 - start  --------------------------------- //
    await queryRunner.query(`DELETE FROM price_sources WHERE name = 'OolongSwap';`);
    // ---------------------------------- CHAIN: boba = 15 - end  --------------------------------- //

    // ---------------------------------- CHAIN: kcc = 16 - start  --------------------------------- //
    await queryRunner.query(`DELETE FROM price_sources WHERE name = 'KuSwap';`);
    await queryRunner.query(`DELETE FROM price_sources WHERE name = 'MojitoSwap';`);
    // ---------------------------------- CHAIN: kcc = 16 - end  --------------------------------- //

    // ---------------------------------- CHAIN: opt = 17 - start  --------------------------------- //
    await queryRunner.query(`DELETE FROM price_sources WHERE name = 'UniSwap V3 Optimism';`);
    await queryRunner.query(`DELETE FROM price_sources WHERE name = 'ZipSwap Optimism';`);
    // ---------------------------------- CHAIN: opt = 17 - end  --------------------------------- //

    // ---------------------------------- CHAIN: aurora = 18 - start  --------------------------------- //
    await queryRunner.query(`DELETE FROM price_sources WHERE name = 'Trisolaris';`);
    await queryRunner.query(`DELETE FROM price_sources WHERE name = 'WannaSwap';`);
    // ---------------------------------- CHAIN: aurora = 18 - end  --------------------------------- //

    // ---------------------------------- CHAIN: klay = 20 - start  --------------------------------- //
    await queryRunner.query(`DELETE FROM price_sources WHERE name = 'ClaimSwap';`);
    // ---------------------------------- CHAIN: klay = 20 - end  --------------------------------- //

    // ---------------------------------- CHAIN: fuse = 21 - start  --------------------------------- //
    await queryRunner.query(`DELETE FROM price_sources WHERE name = 'SushiSwap Fuse';`);
    await queryRunner.query(`DELETE FROM price_sources WHERE name = 'Voltage';`);
    // ---------------------------------- CHAIN: fuse = 21 - end  --------------------------------- //

    // ---------------------------------- CHAIN: metis = 23 - start  --------------------------------- //
    await queryRunner.query(`DELETE FROM price_sources WHERE name = 'NetSwap';`);
    await queryRunner.query(`DELETE FROM price_sources WHERE name = 'Tethys';`);
    // ---------------------------------- CHAIN: metis = 23 - end  --------------------------------- //

    // ---------------------------------- CHAIN: ronin = 24 - start  --------------------------------- //
    await queryRunner.query(`DELETE FROM price_sources WHERE name = 'Katana';`);
    // ---------------------------------- CHAIN: ronin = 24 - end  --------------------------------- //

    // ---------------------------------- CHAIN: iotex = 29 - start  --------------------------------- //
    await queryRunner.query(`DELETE FROM price_sources WHERE name = 'Mimo';`);
    // ---------------------------------- CHAIN: iotex = 29 - end  --------------------------------- //

    // ---------------------------------- CHAIN: milkomeda = 30 - start  --------------------------------- //
    await queryRunner.query(`DELETE FROM price_sources WHERE name = 'MuesliSwap';`);
    await queryRunner.query(`DELETE FROM price_sources WHERE name = 'MilkySwap';`);
    // ---------------------------------- CHAIN: milkomeda = 30 - end  --------------------------------- //
  }
}
