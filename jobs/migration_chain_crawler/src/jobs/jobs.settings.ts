interface JobsSettings {
  name: string;
  seconds: number;
}

export const ETH_MIGRATION_JOB: JobsSettings = {
  name: 'INT_ETH_MIGRATION_JOB',
  seconds: 10,
};

export const BSC_MIGRATION_JOB: JobsSettings = {
  name: 'INT_BSC_MIGRATION_JOB',
  seconds: 10,
};
