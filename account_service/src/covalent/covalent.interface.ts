/* eslint-disable camelcase */
export interface CovalentTsx {
  address: string;
  // The requested wallet address.

  updated_at: string; // date-time
  // The updated time.

  next_update_at: string; // date-time
  // The next updated time.

  quote_currency: string;
  // The requested fiat currency.

  chain_id: number; // int32
  // The requested chain ID.

  items: [
    {
      // The transactions.

      block_signed_at: string; // date-time
      // The signed time of the block.

      block_height: number; // int32
      // The height of the block.

      tx_hash: string;
      // The transaction hash.

      tx_offset: number; // int32
      // The transaction offset.

      successful: boolean;
      // The transaction status.

      from_address: string;
      // The address where the transaction is from.

      from_address_label: string;
      // The label of from address.

      to_address: string;
      // The address where the transaction is to.

      to_address_label: string;
      // The label of to address.

      value: number;
      // The value attached to this tx.

      value_quote: number; // double
      // The value attached in quote-currency to this tx.

      gas_offered: number; // int64
      // The gas offered for this tx.

      gas_spent: number; // int64
      // The gas spent for this tx.

      gas_price: number; // int64
      // The gas price at the time of this tx.

      gas_quote: number; // double
      // The gas spent in quote-currency denomination.

      gas_quote_rate: number; // double
      // Historical ETH price at the time of tx.

      log_events: [
        {
          // The log events.

          block_signed_at: string; // date-time
          // The signed time of the block.

          block_height: number; // int64
          // The height of the block.

          tx_offset: number; // int64
          // The transaction offset.

          log_offset: number; // int64
          // The log offset.

          tx_hash: string;
          // The transaction hash.

          _raw_log_topics_bytes: {
            empty: boolean;
          };
          raw_log_topics: string[];
          sender_contract_decimals: number; // int32
          // Smart contract decimals.

          sender_name: string;
          // Smart contract name.

          sender_contract_ticker_symbol: string;
          // Smart contract ticker symbol.

          sender_address: string;
          // The address of the sender.

          sender_address_label: string;
          // The label of the sender address.

          sender_logo_url: string;
          // Smart contract URL.

          raw_log_data: string;
          // The log events in raw.

          decoded: {
            // The decoded item.

            name: string;
            // The name of the decoded item.

            signature: string;
            // The signature of the decoded item.

            params: [
              {
                // The parameters of the decoded item.

                name: string;
                // The name of the parameter.

                type: string;
                // The type of the parameter.

                indexed: boolean;
                // The index of the parameter.

                decoded: boolean;
                // The decoded value of the parameter.

                value: {
                  // The value of the parameter.
                };
              },
            ];
          };
        },
      ];
    },
  ];
  pagination: {
    has_more: boolean;
    // true if we can paginate to get more data.

    page_number: number; // int32
    // The specific page being returned.

    page_size: number; // int32
    // The number of results per page.

    total_count: number; // int32
    // Total number of entries.
  };
}

export interface CovalentResponse<T = any> {
  data: T;
  error: boolean;
  error_message: null | string;
  error_code: null | number;
}
