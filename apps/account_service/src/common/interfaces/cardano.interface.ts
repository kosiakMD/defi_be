export interface CardanoBalance {
  address: string;
  amount: {
    unit: string;
    quantity: string;
  }[];
  stake_address: string;
  type: 'byron' | 'shelley';
  script: boolean;
}
