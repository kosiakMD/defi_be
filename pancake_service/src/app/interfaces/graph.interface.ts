export interface TheGraphQuery {
  operationName: string;
  variables: Variables;
  query: string;
}

interface Variables {
  allPairs?: string[];
  number?: number;
}
