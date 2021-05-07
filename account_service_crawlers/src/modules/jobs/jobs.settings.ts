interface JobsSettings {
  name: string;
  seconds: number;
}

export const ETH_TOKEN_JOB: JobsSettings = {
  name: 'ETH_TRANSFER_PRICE_JOB',
  seconds: 240,
};

export const BSC_TRANSFER_JOB: JobsSettings = {
  name: 'BSC_TRANSFER_PRICE_JOB',
  seconds: 240,
};
