import { MigrationInterface, QueryRunner } from 'typeorm';

export class addPriceSources1654064257502 implements MigrationInterface {
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
        VALUES ('Sushiswap Empire OKEX', 'univ2-subgraph', '${JSON.stringify(
          {
            chainId: 1,
            subgraphUrl: 'https://api.thegraph.com/subgraphs/name/zikyfranky/empire-okex',
            orderBy: 'totalLiquidity',
          },
          null,
          2,
        )}', true);
    `);
    await queryRunner.query(`
        INSERT INTO price_sources (name, type, config, enabled)
        VALUES ('Solid1234', 'univ2-subgraph', '${JSON.stringify(
          {
            chainId: 1,
            subgraphUrl: 'https://api.thegraph.com/subgraphs/name/oceanbaichuan/solid1234',
            coinSymbol: 'BNB',
            orderBy: 'totalLiquidity',
          },
          null,
          2,
        )}', true);
    `);
    await queryRunner.query(`
        INSERT INTO price_sources (name, type, config, enabled)
        VALUES ('Veniceswap Rinkeby', 'univ2-subgraph', '${JSON.stringify(
          {
            chainId: 1,
            subgraphUrl: 'https://api.thegraph.com/subgraphs/name/jignesh-mxi/veniceswap-rinkeby',
            priceAlias: 'ethPriceUSD',
            orderBy: 'totalSupply',
          },
          null,
          2,
        )}', true);
    `);
    await queryRunner.query(`
        INSERT INTO price_sources (name, type, config, enabled)
        VALUES ('Sushiswap', 'univ2-subgraph', '${JSON.stringify(
          {
            chainId: 1,
            subgraphUrl: 'https://api.thegraph.com/subgraphs/name/sushiswap/exchange',
            orderBy: 'liquidity',
          },
          null,
          2,
        )}', true);
    `);
    // ---------------------------------- CHAIN: eth = 1 - end  --------------------------------- //

    // ---------------------------------- CHAIN: bnb = 2 - start  --------------------------------- //
    await queryRunner.query(`
        INSERT INTO price_sources (name, type, config, enabled)
        VALUES ('Sushiswap BSC Exchange', 'univ2-subgraph', '${JSON.stringify(
          {
            chainId: 2,
            subgraphUrl: 'https://api.thegraph.com/subgraphs/name/sushiswap/bsc-exchange',
            orderBy: 'liquidity',
          },
          null,
          2,
        )}', true);
    `);
    await queryRunner.query(`
        INSERT INTO price_sources (name, type, config, enabled)
        VALUES ('Pancakeswap Exchange', 'univ2-subgraph', '${JSON.stringify(
          {
            chainId: 2,
            subgraphUrl: 'https://api.thegraph.com/subgraphs/name/yohox/pancakeswap-exchange',
            coinSymbol: 'BNB',
            orderBy: 'totalLiquidity',
            chunkSize: 200,
          },
          null,
          2,
        )}', true);
    `);
    await queryRunner.query(`
        INSERT INTO price_sources (name, type, config, enabled)
        VALUES ('Stobox Exchange', 'univ2-subgraph', '${JSON.stringify(
          {
            chainId: 2,
            subgraphUrl: 'https://api.thegraph.com/subgraphs/name/yohox/pancakeswap-exchange',
            coinSymbol: 'BNB',
            orderBy: 'totalLiquidity',
            chunkSize: 100,
          },
          null,
          2,
        )}', true);
    `);
    await queryRunner.query(`
        INSERT INTO price_sources (name, type, config, enabled)
        VALUES ('Apeswap Subgraph', 'univ2-subgraph', '${JSON.stringify(
          {
            chainId: 2,
            subgraphUrl: 'https://api.thegraph.com/subgraphs/name/ikramansari77/apeswap-subgraph',
            orderBy: 'totalLiquidity',
            chunkSize: 10,
          },
          null,
          2,
        )}', true);
    `);
    // ---------------------------------- CHAIN: bnb = 2 - end  --------------------------------- //

    // ---------------------------------- CHAIN: plg = 3 - start  --------------------------------- //
    await queryRunner.query(`
        INSERT INTO price_sources (name, type, config, enabled)
        VALUES ('Sushiswap Matic Exchange', 'univ2-subgraph', '${JSON.stringify(
          {
            chainId: 3,
            subgraphUrl: 'https://api.thegraph.com/subgraphs/name/sushiswap/matic-exchange',
            orderBy: 'liquidity',
            chunkSize: 100,
          },
          null,
          2,
        )}', true);
    `);
    await queryRunner.query(`
        INSERT INTO price_sources (name, type, config, enabled)
        VALUES ('PancakeSwap', 'univ2-subgraph', '${JSON.stringify(
          {
            chainId: 3,
            subgraphUrl: 'https://api.thegraph.com/subgraphs/name/shivannguyen/quickswap-matic2',
            coinSymbol: 'BNB',
            orderBy: 'totalLiquidity',
            chunkSize: 100,
          },
          null,
          2,
        )}', true);
    `);
    await queryRunner.query(`
        INSERT INTO price_sources (name, type, config, enabled)
        VALUES ('Honeyswap Polygon', 'univ2-subgraph', '${JSON.stringify(
          {
            chainId: 3,
            subgraphUrl: 'https://api.thegraph.com/subgraphs/name/1hive/honeyswap-polygon',
            priceAlias: 'nativeCurrencyPrice',
            derivedAlias: 'derivedNativeCurrency',
            orderBy: 'totalLiquidity',
            chunkSize: 100,
          },
          null,
          2,
        )}', true);
    `);
    await queryRunner.query(`
        INSERT INTO price_sources (name, type, config, enabled)
        VALUES ('Free Swap', 'univ2-subgraph', '${JSON.stringify(
          {
            chainId: 3,
            subgraphUrl: 'https://api.thegraph.com/subgraphs/name/feswap/free-swap',
            orderBy: 'totalLiquidity',
            chunkSize: 50,
          },
          null,
          2,
        )}', true);
    `);
    // ---------------------------------- CHAIN: plg = 3 - end  --------------------------------- //

    // ---------------------------------- CHAIN: ftm = 4 - start  --------------------------------- //
    await queryRunner.query(`
        INSERT INTO price_sources (name, type, config, enabled)
        VALUES ('Sushiswap Fantom Exchange', 'univ2-subgraph', '${JSON.stringify(
          {
            chainId: 4,
            subgraphUrl: 'https://api.thegraph.com/subgraphs/name/sushiswap/fantom-exchange',
            orderBy: 'liquidity',
            chunkSize: 50,
          },
          null,
          2,
        )}', true);
    `);
    await queryRunner.query(`
        INSERT INTO price_sources (name, type, config, enabled)
        VALUES ('Kyberswap Exchange Fantom', 'univ2-subgraph', '${JSON.stringify(
          {
            chainId: 4,
            subgraphUrl: 'https://api.thegraph.com/subgraphs/name/ldcduc/kyberswap-exchange-fantom',
            orderBy: 'totalLiquidity',
            chunkSize: 100,
          },
          null,
          2,
        )}', true);
    `);
    await queryRunner.query(`
        INSERT INTO price_sources (name, type, config, enabled)
        VALUES ('PaintswapFinance', 'univ2-subgraph', '${JSON.stringify(
          {
            chainId: 4,
            subgraphUrl: 'https://api.thegraph.com/subgraphs/name/paint-swap-finance/exchange',
            coinSymbol: 'FTM',
            orderBy: 'totalLiquidity',
            chunkSize: 50,
          },
          null,
          2,
        )}', true);
    `);
    await queryRunner.query(`
        INSERT INTO price_sources (name, type, config, enabled)
        VALUES ('DFYN Fantom Graph V1', 'univ2-subgraph', '${JSON.stringify(
          {
            chainId: 4,
            subgraphUrl: 'https://api.thegraph.com/subgraphs/name/ss-sonic/fantom-graph-v1',
            orderBy: 'totalLiquidity',
            chunkSize: 100,
          },
          null,
          2,
        )}', true);
    `);
    // ---------------------------------- CHAIN: ftm = 4 - end  --------------------------------- //

    // ---------------------------------- CHAIN: arbi = 5 - start  --------------------------------- //
    await queryRunner.query(`
        INSERT INTO price_sources (name, type, config, enabled)
        VALUES ('Sushiswap Arbitrum Exchange', 'univ2-subgraph', '${JSON.stringify(
          {
            chainId: 5,
            subgraphUrl: 'https://api.thegraph.com/subgraphs/name/sushiswap/arbitrum-exchange',
            orderBy: 'liquidity',
            chunkSize: 100,
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
            orderBy: 'totalLiquidity',
            chunkSize: 100,
          },
          null,
          2,
        )}', true);
    `);
    // ---------------------------------- CHAIN: arbi = 5 - end  --------------------------------- //

    // ---------------------------------- CHAIN: avax = 6 - start  --------------------------------- //
    await queryRunner.query(`
        INSERT INTO price_sources (name, type, config, enabled)
        VALUES ('Sushiswap Avalanche Exchange', 'univ2-subgraph', '${JSON.stringify(
          {
            chainId: 6,
            subgraphUrl: 'https://api.thegraph.com/subgraphs/name/sushiswap/avalanche-exchange',
            orderBy: 'liquidity',
            chunkSize: 100,
          },
          null,
          2,
        )}', true);
    `);
    await queryRunner.query(`
        INSERT INTO price_sources (name, type, config, enabled)
        VALUES ('AVADEX-IO Exchange', 'univ2-subgraph', '${JSON.stringify(
          {
            chainId: 6,
            subgraphUrl: 'https://api.thegraph.com/subgraphs/name/avadex-io/exchange',
            coinSymbol: 'BNB',
            orderBy: 'totalLiquidity',
            chunkSize: 50,
          },
          null,
          2,
        )}', true);
    `);
    // ---------------------------------- CHAIN: avax = 6 - end  --------------------------------- //

    // ---------------------------------- CHAIN: gnosis = 7 - start  --------------------------------- //
    await queryRunner.query(`
        INSERT INTO price_sources (name, type, config, enabled)
        VALUES ('Sushiswap xDai Exchange', 'univ2-subgraph', '${JSON.stringify(
          {
            chainId: 7,
            subgraphUrl: 'https://api.thegraph.com/subgraphs/name/sushiswap/xdai-exchange',
            orderBy: 'liquidity',
            chunkSize: 100,
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
            orderBy: 'totalLiquidity',
            chunkSize: 10,
          },
          null,
          2,
        )}', true);
    `);
    // ---------------------------------- CHAIN: gnosis = 7 - end  --------------------------------- //

    // ---------------------------------- CHAIN: celo = 8 - start  --------------------------------- //
    await queryRunner.query(`
        INSERT INTO price_sources (name, type, config, enabled)
        VALUES ('Sushiswap Celo Exchange', 'univ2-subgraph', '${JSON.stringify(
          {
            chainId: 8,
            subgraphUrl: 'https://api.thegraph.com/subgraphs/name/sushiswap/celo-exchange',
            orderBy: 'liquidity',
            chunkSize: 100,
          },
          null,
          2,
        )}', true);
    `);
    // ---------------------------------- CHAIN: celo = 8 - end  --------------------------------- //

    // ---------------------------------- CHAIN: mriver = 9 - start  --------------------------------- //
    await queryRunner.query(`
        INSERT INTO price_sources (name, type, config, enabled)
        VALUES ('Padswap Subgraph Moonriver', 'univ2-subgraph', '${JSON.stringify(
          {
            chainId: 9,
            subgraphUrl:
              'https://api.thegraph.com/subgraphs/name/toadguy/padswap-subgraph-moonriver',
            chunkSize: 100,
          },
          null,
          2,
        )}', true);
    `);
    await queryRunner.query(`
        INSERT INTO price_sources (name, type, config, enabled)
        VALUES ('Moonriver Exchange', 'univ2-subgraph', '${JSON.stringify(
          {
            chainId: 9,
            subgraphUrl: 'https://api.thegraph.com/subgraphs/name/matthewlilley/moonriver-exchange',
            orderBy: 'liquidity',
            chunkSize: 50,
          },
          null,
          2,
        )}', true);
    `);
    // ---------------------------------- CHAIN: mriver = 9 - end  --------------------------------- //

    // ---------------------------------- CHAIN: harm = 10 - start  --------------------------------- //
    await queryRunner.query(`
        INSERT INTO price_sources (name, type, config, enabled)
        VALUES ('Sushiswap Harmony Exchange', 'univ2-subgraph', '${JSON.stringify(
          {
            chainId: 10,
            subgraphUrl: 'https://api.thegraph.com/subgraphs/name/sushiswap/harmony-exchange',
            orderBy: 'liquidity',
            chunkSize: 50,
          },
          null,
          2,
        )}', true);
    `);
    // ---------------------------------- CHAIN: harm = 10 - end  --------------------------------- //

    // ---------------------------------- CHAIN: opt = 17 - start  --------------------------------- //
    await queryRunner.query(`
        INSERT INTO price_sources (name, type, config, enabled)
        VALUES ('Optimism Post Regenesis', 'univ2-subgraph', '${JSON.stringify(
          {
            chainId: 17,
            subgraphUrl:
              'https://api.thegraph.com/subgraphs/name/ianlapham/optimism-post-regenesis',
            priceAlias: 'ethPriceUSD',
            orderBy: 'totalSupply',
            chunkSize: 100,
          },
          null,
          2,
        )}', true);
    `);
    // ---------------------------------- CHAIN: opt = 17 - end  --------------------------------- //

    // ---------------------------------- CHAIN: near = 18 - start  --------------------------------- //
    await queryRunner.query(`
        INSERT INTO price_sources (name, type, config, enabled)
        VALUES ('Alium Exchange Aurora', 'univ2-subgraph', '${JSON.stringify(
          {
            chainId: 18,
            subgraphUrl:
              'https://api.thegraph.com/subgraphs/name/alium-finance/alium-exchange-aurora',
            priceAlias: 'nativePrice',
            derivedAlias: 'derivedNative',
            orderBy: 'totalLiquidity',
            chunkSize: 10,
          },
          null,
          2,
        )}', true);
    `);
    await queryRunner.query(`
        INSERT INTO price_sources (name, type, config, enabled)
        VALUES ('Kyberswap Exchange Aurora', 'univ2-subgraph', '${JSON.stringify(
          {
            chainId: 18,
            subgraphUrl:
              'https://api.thegraph.com/subgraphs/name/kybernetwork/kyberswap-exchange-aurora',
            orderBy: 'totalLiquidity',
            chunkSize: 10,
          },
          null,
          2,
        )}', true);
    `);
    // ---------------------------------- CHAIN: near = 18 - end  --------------------------------- //

    // ---------------------------------- CHAIN: fuse = 21 - start  --------------------------------- //
    await queryRunner.query(`
        INSERT INTO price_sources (name, type, config, enabled)
        VALUES ('Sushiswap Fuse Exchange', 'univ2-subgraph', '${JSON.stringify(
          {
            chainId: 21,
            subgraphUrl: 'https://api.thegraph.com/subgraphs/name/sushiswap/fuse-exchange',
            orderBy: 'liquidity',
            chunkSize: 100,
          },
          null,
          2,
        )}', true);
    `);
    // ---------------------------------- CHAIN: fuse = 21 - end  --------------------------------- //
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
    await queryRunner.query(`DELETE FROM price_sources WHERE name = 'Sushiswap Empire OKEX';`);
    await queryRunner.query(`DELETE FROM price_sources WHERE name = 'Solid1234';`);
    await queryRunner.query(`DELETE FROM price_sources WHERE name = 'Veniceswap Rinkeby';`);
    await queryRunner.query(`DELETE FROM price_sources WHERE name = 'Sushiswap';`);
    // ---------------------------------- CHAIN: eth = 1 - end  --------------------------------- //

    // ---------------------------------- CHAIN: bnb = 2 - start  --------------------------------- //
    await queryRunner.query(`DELETE FROM price_sources WHERE name = 'Sushiswap BSC Exchange';`);
    await queryRunner.query(`DELETE FROM price_sources WHERE name = 'Pancakeswap Exchange';`);
    await queryRunner.query(`DELETE FROM price_sources WHERE name = 'Stobox Exchange';`);
    await queryRunner.query(`DELETE FROM price_sources WHERE name = 'Apeswap Subgraph';`);
    // ---------------------------------- CHAIN: bnb = 2 - end  --------------------------------- //

    // ---------------------------------- CHAIN: plg = 3 - start  --------------------------------- //
    await queryRunner.query(`DELETE FROM price_sources WHERE name = 'Sushiswap Matic Exchange';`);
    await queryRunner.query(`DELETE FROM price_sources WHERE name = 'PancakeSwap';`);
    await queryRunner.query(`DELETE FROM price_sources WHERE name = 'Honeyswap Polygon';`);
    await queryRunner.query(`DELETE FROM price_sources WHERE name = 'Free Swap';`);
    // ---------------------------------- CHAIN: plg = 3 - end  --------------------------------- //

    // ---------------------------------- CHAIN: ftm = 4 - start  --------------------------------- //
    await queryRunner.query(`DELETE FROM price_sources WHERE name = 'Sushiswap Fantom Exchange';`);
    await queryRunner.query(`DELETE FROM price_sources WHERE name = 'Kyberswap Exchange Fantom';`);
    await queryRunner.query(`DELETE FROM price_sources WHERE name = 'PaintswapFinance';`);
    await queryRunner.query(`DELETE FROM price_sources WHERE name = 'DFYN Fantom Graph V1';`);
    // ---------------------------------- CHAIN: ftm = 4 - end  --------------------------------- //

    // ---------------------------------- CHAIN: arbi = 5 - start  --------------------------------- //
    await queryRunner.query(
      `DELETE FROM price_sources WHERE name = 'Sushiswap Arbitrum Exchange';`,
    );
    await queryRunner.query(`DELETE FROM price_sources WHERE name = 'Swapr Arbitrum One V2';`);
    // ---------------------------------- CHAIN: arbi = 5 - end  --------------------------------- //

    // ---------------------------------- CHAIN: avax = 6 - start  --------------------------------- //
    await queryRunner.query(
      `DELETE FROM price_sources WHERE name = 'Sushiswap Avalanche Exchange';`,
    );
    await queryRunner.query(`DELETE FROM price_sources WHERE name = 'AVADEX-IO Exchange';`);
    // ---------------------------------- CHAIN: avax = 6 - end  --------------------------------- //

    // ---------------------------------- CHAIN: gnosis = 7 - start  --------------------------------- //
    await queryRunner.query(`DELETE FROM price_sources WHERE name = 'Sushiswap xDai Exchange';`);
    await queryRunner.query(`DELETE FROM price_sources WHERE name = 'Honeyswap V2';`);
    // ---------------------------------- CHAIN: gnosis = 7 - end  --------------------------------- //

    // ---------------------------------- CHAIN: celo = 8 - start  --------------------------------- //
    await queryRunner.query(`DELETE FROM price_sources WHERE name = 'Sushiswap Celo Exchange';`);
    // ---------------------------------- CHAIN: celo = 8 - end  --------------------------------- //

    // ---------------------------------- CHAIN: mriver = 9 - start  --------------------------------- //
    await queryRunner.query(`DELETE FROM price_sources WHERE name = 'Padswap Subgraph Moonriver';`);
    await queryRunner.query(`DELETE FROM price_sources WHERE name = 'Moonriver Exchange';`);
    // ---------------------------------- CHAIN: mriver = 9 - end  --------------------------------- //

    // ---------------------------------- CHAIN: harm = 10 - start  --------------------------------- //
    await queryRunner.query(`DELETE FROM price_sources WHERE name = 'Sushiswap Harmony Exchange';`);
    // ---------------------------------- CHAIN: harm = 10 - end  --------------------------------- //

    // ---------------------------------- CHAIN: opt = 17 - start  --------------------------------- //
    await queryRunner.query(`DELETE FROM price_sources WHERE name = 'Optimism Post Regenesis';`);
    // ---------------------------------- CHAIN: opt = 17 - end  --------------------------------- //

    // ---------------------------------- CHAIN: near = 18 - start  --------------------------------- //
    await queryRunner.query(`DELETE FROM price_sources WHERE name = 'Alium Exchange Aurora';`);
    await queryRunner.query(`DELETE FROM price_sources WHERE name = 'Kyberswap Exchange Aurora';`);
    // ---------------------------------- CHAIN: near = 18 - end  --------------------------------- //

    // ---------------------------------- CHAIN: fuse = 21 - start  --------------------------------- //
    await queryRunner.query(`DELETE FROM price_sources WHERE name = 'Sushiswap Fuse Exchange';`);
    // ---------------------------------- CHAIN: fuse = 21 - end  --------------------------------- //
  }
}
