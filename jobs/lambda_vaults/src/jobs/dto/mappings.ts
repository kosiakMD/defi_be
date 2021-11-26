// eslint-disable-next-line max-classes-per-file
export class PoolsFeatureMapping {
  dbId: number;
  dtoName: string;
  lpToken: {
    dbId: number;
    dtoName: string;
  };
  tokens?: {
    dbId: number;
    dtoName: string;
    positionInPool: number;
    weight?: number;
    tokens?: {
      dbId: number;
      dtoName: string;
      positionInPool: number;
    }[];
    // lp?: { dbId: string; dtoName: string };
  }[];
}

export class StakingFeatureMapping {
  dbId: number;
  dtoName: string;
  rewards: {
    dbId: number;
    dtoName: string;
  }[];
  stakingToken: {
    dbId: number;
    dtoName: string;
    tokens?: {
      dbId: number;
      dtoName: string;
      positionInPool: number;
      tokens?: {
        dbId: number;
        dtoName: string;
        positionInPool: number;
      }[];
    }[];
  };
}
