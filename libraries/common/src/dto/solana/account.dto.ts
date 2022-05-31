export interface AccountInfo {
  info: {
    isNative: false;
    mint: string;
    owner: string;
    state: string;
    tokenAmount: {
      amount: string;
      decimals: number;
      uiAmount: number;
      uiAmountString: number;
    };
  };
  type: string;
}
