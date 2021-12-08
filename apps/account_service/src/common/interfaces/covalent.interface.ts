/* eslint-disable camelcase */
import { Address } from '@app/common/types';
import { ChainId } from '@app/common/types';

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace Covalent {
  export interface Transaction {
    // The requested wallet address.
    address: string;
    // The updated time.
    updated_at: string; // date-time
    // The next updated time.
    next_update_at: string; // date-time
    // The requested fiat currency.
    quote_currency: string;
    // The requested chain ID.
    chain_id: number; // int32
    // The transactions.
    items: [
      {
        // The signed time of the block.
        block_signed_at: string; // date-time
        // The height of the block.
        block_height: number; // int32
        // The transaction hash.
        tx_hash: string;
        // The transaction offset.
        tx_offset: number; // int32
        // The transaction status.
        successful: boolean;
        // The address where the transaction is from.
        from_address: string;
        // The label of from address.
        from_address_label: string;
        // The address where the transaction is to.
        to_address: string;
        // The label of to address.
        to_address_label: string;
        // The value attached to this tx.
        value: number;
        // The value attached in quote-currency to this tx.
        value_quote: number; // double
        // The gas offered for this tx.
        gas_offered: number; // int64
        // The gas spent for this tx.
        gas_spent: number; // int64
        // The gas price at the time of this tx.
        gas_price: number; // int64
        // The gas spent in quote-currency denomination.
        gas_quote: number; // double
        // Historical ETH price at the time of tx.
        gas_quote_rate: number; // double
        // The log events.
        log_events: [
          {
            // The signed time of the block.
            block_signed_at: string; // date-time
            // The height of the block.
            block_height: number; // int64
            // The transaction offset.
            tx_offset: number; // int64
            // The log offset.
            log_offset: number; // int64
            // The transaction hash.
            tx_hash: string;
            //
            _raw_log_topics_bytes: {
              empty: boolean;
            };
            //
            raw_log_topics: string[];
            // Smart contract decimals.
            sender_contract_decimals: number; // int32
            // Smart contract name.
            sender_name: string;
            // Smart contract ticker symbol.
            sender_contract_ticker_symbol: string;
            // The address of the sender.
            sender_address: string;
            // The label of the sender address.
            sender_address_label: string;
            // Smart contract URL.
            sender_logo_url: string;
            // The log events in raw.
            raw_log_data: string;
            // The decoded item.
            decoded: {
              // The name of the decoded item.
              name: string;
              // The signature of the decoded item.
              signature: string;
              // The parameters of the decoded item.
              params: [
                {
                  // The name of the parameter.
                  name: string;
                  // The type of the parameter.
                  type: string;
                  // The index of the parameter.
                  indexed: boolean;
                  // The decoded value of the parameter.
                  decoded: boolean;
                  // The value of the parameter.
                  value: any; // {}
                },
              ];
            };
          },
        ];
      },
    ];
    pagination: {
      // true if we can paginate to get more data.
      has_more: boolean;
      // The specific page being returned.
      page_number: number; // int32
      // The number of results per page.
      page_size: number; // int32
      // Total number of entries.
      total_count: number; // int32
    };
  }

  interface NftData {
    // The ID of the NFT.
    token_id: number; // integer
    // The count of the number of NFTs with this ID.
    token_balance: number; // integer
    // External URL for additional metadata.
    token_url: string;
    // The standard interface(s) supported for this token, eg `ERC-20`.
    supports_erc: string[];
    // The latest price value on chain of the token ID.
    token_price_wei: number; // integer
    // The latest quote_rate of the token ID denominated in unscaled ETH.
    token_quote_rate_eth: string;
    // The address of the original owner of this NFT.
    original_owner: string;
    // Externally fetched metadata.
    external_data: {
      // The Name of the NFT.
      name: string;
      // The Description or Bio of the NFT.
      description: string;
      // The Image URL of the NFT.
      image: string;
      // The External URL of the NFT.
      external_url: string;
      // Array of additional attributes of the NFT.
      attributes: any; // {}
      // The owner of the NFT.
      owner: string;
    };
    // The address of the current owner of this NFT.
    owner: string;
    // When set to true, this NFT has been Burned.
    burned: boolean;
  }

  export enum BalanceTypeEnum {
    stablecoin = 'stablecoin',
    cryptocurrency = 'cryptocurrency',
    dust = 'dust',
  }

  export interface TokenBalance {
    // Current balance.
    balance: string; // integer? "11876041563"
    // The asset balance 24 hours ago.
    balance_24h: null; //
    // Smart contract address.
    contract_address: string; // "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48"
    // Smart contract decimals.
    contract_decimals: number; // int32 6
    // Smart contract ticker name.
    contract_name: string; // "USD Coin"
    // Smart contract ticker symbol.
    contract_ticker_symbol: string; // "USDC"
    // Smart contract URL.
    logo_url: string; // "https://logos.covalenthq.com/tokens/0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48.png"
    // Array of NFTs that are held under this contract.
    nft_data: NftData[]; // null
    // The current balance converted to fiat in quote-currency.
    quote: number; // float 11950.063
    // The current spot exchange rate in quote-currency.
    quote_rate: number; // float 1.0062329
    supports_erc: string[]; // ["erc20"]
    type: BalanceTypeEnum; // "stablecoin"
    // Total supply of this pool token.
    // total_supply?: number; // integer 0
  }

  export interface PoolTokenBalance extends TokenBalance {
    // Total supply of this pool token.
    total_supply: number; // integer 0
  }

  export interface Balance {
    address: Address;
    chain_id: ChainId;
    items: (TokenBalance | PoolTokenBalance)[];
    updated_at: string; // date-time "2021-07-12T23:49:16.000698655Z"
    next_update_at: string; // date-time "2021-07-12T23:49:16.000698655Z"
    pagination: string; // null
    quote_currency: string; // "USD"
  }

  export interface Response<T = any> {
    data: T;
    error: boolean;
    error_message: null | string;
    error_code: null | number;
  }
}
