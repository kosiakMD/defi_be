export interface Block {
  id: string;
  number: number;
  timestamp: number;
  parentHash: string;
  author: string;
  difficulty: number;
  totalDifficulty: number;
  gasUsed: number;
  gasLimit: number;
  receiptsRoot: string;
  transactionsRoot: string;
  stateRoot: string;
  size: number;
  unclesHash: string;
}
