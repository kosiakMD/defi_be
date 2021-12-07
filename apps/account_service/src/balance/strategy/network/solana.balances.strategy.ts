import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { Connection, PublicKey } from '@solana/web3.js';
import BigNumber from 'bignumber.js';

import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '@app/common';
import { SOL_COIN_ADDRESS } from '@app/common/constant';
import { AccountInfo } from '@app/common/dto/solana';

import { Web3Provider } from '../../../chain/web3.provider';
import { TokenBalance } from '../../interfaces/balance.interfaces';
import { BalancesLoadingStrategy, BalancesRequest } from '../index';

@Injectable()
export class SolanaBalancesStrategy implements BalancesLoadingStrategy {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    private readonly config: ConfigService,
    private readonly web3Provider: Web3Provider,
  ) {}

  async getBalances({
    address,
    chainId,
    tokens: originalTokens,
    block,
  }: BalancesRequest): Promise<TokenBalance[]> {
    let tokenBalances: TokenBalance[] = [];
    let pubKey;
    try {
      pubKey = new PublicKey(address);
    } catch (e) {
      // don't do anything because log and erorrs will cause a lot of redundant messages
      return tokenBalances;
    }

    const originalTokensSet: Set<string> = new Set<string>(originalTokens);
    if (!originalTokens.length || !PublicKey.isOnCurve(pubKey.toBytes())) {
      return tokenBalances;
    }

    const message = `Network balances loading for address ${address} and chain ${chainId}  at block ${
      block?.block ?? "'latest'"
    }`;
    this.logger.time(message);

    const web3: Connection = this.web3Provider.getInstance(chainId);
    // amount of calls can be reduced using batch calls only for specific tokens
    // but the lib doesn't support it for now
    const [accountBalances, solBalance] = await Promise.all([
      web3.getParsedTokenAccountsByOwner(pubKey, {
        programId: TOKEN_PROGRAM_ID,
      }),
      web3.getBalance(pubKey),
    ]);

    tokenBalances = accountBalances.value
      .map((ab) => {
        const ai: AccountInfo = ab.account.data.parsed as AccountInfo;
        return {
          token: {
            chainId: chainId,
            address: ai.info.mint,
          },
          amount: ai.info.tokenAmount.amount,
        };
      })
      .filter(
        ({ amount, token }) => new BigNumber(amount).gt(0) && originalTokensSet.has(token.address),
      );
    if (originalTokensSet.has(SOL_COIN_ADDRESS)) {
      tokenBalances.push({
        token: {
          chainId: chainId,
          address: SOL_COIN_ADDRESS,
        },
        amount: solBalance.toString(),
      });
    }
    this.logger.timeEnd(message);
    return tokenBalances;
  }
}
