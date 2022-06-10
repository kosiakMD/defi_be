export const V1Endpoints = {
  Assets: () => '/v1/assets',
  GetBulk: () => '/v1/assets/get-bulk',
  Search: () => '/v1/assets/search',
  Candidate: () => '/v1/assets/candidate',
  Categories: () => '/v1/assets-category',
  Category: (id = '{id}') => `/v1/assets-category/${id}`,
};
