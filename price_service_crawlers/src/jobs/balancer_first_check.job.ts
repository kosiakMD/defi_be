import { Inject, Injectable, LoggerService } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { NEST_PGPROMISE_CONNECTION } from 'nestjs-pgpromise';
import { IDatabase } from 'pg-promise';

import { DatabaseService } from '../services/database.service';
import { Api } from '../thegraph/api';
import { toTimestamp } from '../utils/common';
import { CURRENCY, PLATFORM } from '../utils/constants';
import { getNextDayStart } from '../utils/time';

export type TokenAddreses = { [key: string]: number };
// TODO: fpr what?
// const http = rateLimit(axios.create(), { maxRPS: 1, perMilliseconds: 5000 });
// export type TokenPrices = { [key: string]: number };
// export type CoingeckoTokenPrices = { [key: string]: { value: number; db_id: any } };
// const tokens: string[] = TEST_TOKENS;

@Injectable()
export class BalancerFirstCheckJob {
	constructor(
		@Inject(NEST_PGPROMISE_CONNECTION) public pg: IDatabase<any>,
		private databaseService: DatabaseService,
		private theGraphService: Api,
		@Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: LoggerService,
	) {}

	public async crawlNewTokens(job: any, done: any): Promise<void> {
		try {
			const currentPlatfromId = await this.databaseService.getCurrentPlatform();
			if (!currentPlatfromId) {
				throw 'No current platform in DB: ' + PLATFORM;
			}

			const currentCurrencyId = await this.databaseService.getCurrentCurrency();
			if (!currentCurrencyId) {
				throw 'No current currency in DB: ' + CURRENCY;
			}

			this.logger.log('request prepared');
			const tokenRequest = await this.theGraphService.getBalancerPoolsTokens();
			//this.logger.log("tokens ",tokenRequest['data'][''])
			const tokens = tokenRequest['data']['data']['pools'];

			const dbAssets = await this.databaseService.getUniTokens();
			// TODO: fpr what?
			// eslint-disable-next-line @typescript-eslint/no-unused-vars
			const dbTokenAddresses = dbAssets.map((token) => token['address']);

			for (let i = 0; i < tokens.length; i++) {
				const poolTokens = tokens[i]['tokens'];

				let lpTokenPrice = 0;
				this.logger.log(
					'checking token-pool  ' + tokens[i]['id'] + ' with token length ' + poolTokens.length,
				);
				if (parseInt(tokens[i]['totalShares']) !== 0) {
					let noTokenPrice = false,
						totalValueLocked = 0,
						totalName = '',
						totalSymbol = '';
					for (let z = 0; z < poolTokens.length; z++) {
						try {
							let tokenPrice;
							this.logger.log(poolTokens[z], `poolTokens[${z}]`);
							totalName += (totalName.length ? '-' : '') + poolTokens[z]['name'];
							totalSymbol += (totalSymbol.length ? '-' : '') + poolTokens[z]['symbol'];

							const currentDbToken = await this.databaseService.getTokenByAddress(
								poolTokens[z]['id'].split('-')[1],
							);
							if (currentDbToken.length) {
								const currentDbTokenPrice = await this.databaseService.getTokenPrice(
									currentDbToken[0]['id'],
								);
								if (currentDbTokenPrice.length) {
									this.logger.log('priceFound');
									tokenPrice = currentDbTokenPrice[0]['value'];
									this.logger.log(tokenPrice, currentDbTokenPrice[0]['asset_id']);
								} else {
									this.logger.log('price_not_found');
								}
							}

							if (!tokenPrice) {
								this.logger.log('noTokenPrice');
								noTokenPrice = true;
								break;
							}

							totalValueLocked += Number(poolTokens[z]['balance']) * Number(tokenPrice);
						} catch (e) {
							// TODO: create extended Error
							this.logger.error(e, 'Balancer token parse ERROR');
						}
					}
					if (noTokenPrice) {
						continue;
					}

					lpTokenPrice = totalValueLocked / Number(tokens[i]['totalShares']);
					this.logger.log(lpTokenPrice, 'lpTokenPrice');

					let dbPool = await this.databaseService.getTokenByAddress(tokens[i]['id']);
					this.logger.log(dbPool, 'dbPool');
					if (!dbPool.length) {
						// TODO: for what?
						// eslint-disable-next-line @typescript-eslint/no-unused-vars
						const newEntity = await this.databaseService.addNewSushiTokenToDb(
							tokens[i]['id'],
							totalName,
							totalSymbol,
							PLATFORM,
							'BALANCER',
							currentPlatfromId,
						);

						dbPool = await this.databaseService.getTokenByAddress(tokens[i]['id']);
					}

					await this.databaseService.addOnePrice(
						dbPool[0]['id'],
						toTimestamp(new Date()),
						lpTokenPrice,
						currentCurrencyId,
					);
				} else {
					//this.logger.log('totalShares is 0')
					continue;
				}
			}
		} catch (e) {
			this.logger.error(e);
		}
		done();
	}

	public crawlNewTokensHistory = async (job: any, done: any): Promise<void> => {
		const currentCurrencyId = await this.databaseService.getCurrentCurrency();
		if (!currentCurrencyId) {
			throw 'No current currency in DB: ' + CURRENCY;
		}

		const currentPlatfromId = await this.databaseService.getCurrentPlatform();
		if (!currentPlatfromId) {
			throw 'No current platform in DB: ' + PLATFORM;
		}

		const dbAssets = await this.databaseService.getNewTokensByResource('BALANCER');
		this.logger.log('starting uniswap history clawler');

		const firstTxData = await this.theGraphService.getBalancerfirstTxTimestamp();
		const firstTimestamp = parseInt(firstTxData['data']['data']['transactions'][0]['timestamp']);
		this.logger.log(firstTxData['data']['data']['transactions'], 'firstTxData');

		const currentDayTs = Math.round(Date.now() / 1000);

		this.logger.log(currentDayTs, ' currentDayTs');

		for (let i = 0; i < dbAssets.length; i++) {
			let dayNum = 0,
				checkDayTs = getNextDayStart(firstTimestamp);
			this.logger.log(checkDayTs, 'checkDayTs');
			let pricesCount = 0;
			do {
				const firstDayBlockQuery = await this.theGraphService.getBalancerfirstBlockQuery(
					checkDayTs,
				);
				const blockNumber = firstDayBlockQuery['data']['data']['blocks'][0]['block'];
				this.logger.log(blockNumber, 'blockNumber');

				const dailyPriceQuery = await this.theGraphService.getBalancerDailyBlockPricesQuery(
					parseInt(blockNumber),
					dbAssets[i]['address'],
				);
				this.logger.log(dailyPriceQuery['data']['data']);
				if (dailyPriceQuery['data']['data']['pools'].length) {
					const { totalShares, tokens } = dailyPriceQuery['data']['data']['pools'][0];

					const poolTokens = tokens;
					let lpTokenPrice = 0;

					this.logger.log(
						dbAssets[i]['address'] + ' with token length ' + poolTokens.length,
						'checking token-pool',
					);
					if (parseInt(totalShares) !== 0) {
						let noTokenPrice = false,
							totalValueLocked = 0,
							totalName = '',
							totalSymbol = '';

						for (let z = 0; z < poolTokens.length; z++) {
							let tokenPrice;
							this.logger.log(z, 'z');
							totalName += (totalName.length ? '-' : '') + poolTokens[z]['name'];
							totalSymbol += (totalSymbol.length ? '-' : '') + poolTokens[z]['symbol'];

							const currentDbToken = await this.databaseService.getTokenByAddress(
								poolTokens[z]['id'].split('-')[1],
							);
							if (currentDbToken.length) {
								const currentDbTokenPrice = await this.databaseService.getTokenPrice(
									currentDbToken[0]['id'],
								);

								if (currentDbTokenPrice.length) {
									tokenPrice = currentDbTokenPrice[0]['value'];
									this.logger.log(tokenPrice, currentDbTokenPrice[0]['asset_id']);
								} else {
									/*price not found */
								}
							}

							if (!tokenPrice) {
								noTokenPrice = true;
								break;
							}

							totalValueLocked += Number(poolTokens[z]['balance']) * Number(tokenPrice);
							//this.logger.log("totalValueLocked ",totalValueLocked)
						}
						if (noTokenPrice) {
							this.logger.log('no token price...NEXT');
							continue;
						}

						lpTokenPrice = totalValueLocked / Number(totalShares);
						this.logger.log(lpTokenPrice, 'lpTokenPrice');

						await this.databaseService.addOnePrice(
							dbAssets[i]['id'],
							checkDayTs,
							lpTokenPrice,
							currentCurrencyId,
						);
						pricesCount++;
					} else {
						//this.logger.log('totalShares is 0')
						dayNum++;
						continue;
					}
				}

				dayNum++;
				this.logger.log(checkDayTs);
				checkDayTs = getNextDayStart(firstTimestamp, dayNum);
			} while (checkDayTs < currentDayTs);

			if (pricesCount) {
				await this.databaseService.setAssetAsNotNew(dbAssets[i]['id']);
				this.logger.log('Updated pool to OLD from NEW');
			}
		}

		done();
	};
}
