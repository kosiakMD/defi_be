import { Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common';

import { BalancesLoadingStrategy } from '../../../common/interfaces';
import { BalancesRequest } from '../../../common/types';
import { Web3Provider } from '../../../common/providers/chainRelated/web3.provider';

import type { TokenBalance } from '../balances.interfaces';
import { CARDANO_COIN_ADDRESS } from '@app/common/constant';

export class CardanoBalancesStrategy implements BalancesLoadingStrategy {
    constructor(
        @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
        private readonly config: ConfigService,
        private readonly web3Provider: Web3Provider,
    ) { }

    async getBalances({ address, chainId, tokens: originalTokens }: BalancesRequest): Promise<TokenBalance[]> {
        let tokenBalances: TokenBalance[] = [];

        if (!originalTokens.length || !address.match(/^addr1.*/)) {
            return [];
        }
        var tokenFilters = new Set<string>(originalTokens);
        var cardona = this.web3Provider.getCadronaInstance(chainId);

        try {
            const wallet = await cardona.addresses(address);

            for (const asset of wallet.amount) {
                if (tokenFilters.has(asset.unit) || asset.unit === 'lovelace') {
                    tokenBalances.push({
                        token: {
                            chainId: chainId,
                            address: (asset.unit !== 'lovelace') ? asset.unit : CARDANO_COIN_ADDRESS,
                        },
                        amount: asset.quantity,
                    })
                }
            }
        } catch (error) {
            /** blockfrost couldn't load information about the wallet if it has 0 coins */
            tokenBalances.push({
                token: {
                    chainId: chainId,
                    address: CARDANO_COIN_ADDRESS,
                },
                amount: '0',
            })
        }


        return tokenBalances;
    }
}
