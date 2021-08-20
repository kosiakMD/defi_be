export interface Event {
  address: string;
  blockHash: string;
  blockNumber: number;
  logIndex: number;
  removed: boolean;
  transactionHash: string;
  transactionIndex: number;
  id: string;
  returnValues: any;
  event: string;
  signature: string;
}

export interface Deposit {
  dst: string;
  wad: string;
}

export interface DepositEvent extends Event {
  returnValues: Deposit;
}

export interface Withdrawal {
  src: string;
  wad: string;
}

export interface WithdrawalEvent extends Event {
  returnValues: Withdrawal;
}
