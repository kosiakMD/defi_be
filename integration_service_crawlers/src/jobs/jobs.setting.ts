interface JobsSettings {
  name: string;
  seconds: number;
}

export const POOLS_JOB: JobsSettings = {
  name: 'INT_POOLS_JOB',
  seconds: 300,
};

export const VAULTS_JOB: JobsSettings = {
  name: 'INT_VAULTS_JOB',
  seconds: 300,
};
