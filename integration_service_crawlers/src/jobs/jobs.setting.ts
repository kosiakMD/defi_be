interface JobsSettings {
  name: string;
  seconds: number;
}

export const UNISWAP_JOB: JobsSettings = {
  name: 'INT_UNISWAP_JOB',
  seconds: 60,
};

export const SUSHISWAP_JOB: JobsSettings = {
  name: 'INT_SUSHISWAP_JOB',
  seconds: 60,
};

export const PANCAKE_JOB: JobsSettings = {
  name: 'INT_PANCAKE_JOB',
  seconds: 60,
};

export const POOLS_JOB: JobsSettings = {
  name: 'INT_POOLS_JOB',
  seconds: 300,
};

export const VAULTS_JOB: JobsSettings = {
  name: 'INT_VAULTS_JOB',
  seconds: 300,
};
