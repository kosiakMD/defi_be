export type URLEndpoint = `http://${string}` | `https://${string}`;
export type CronExpression = string;
export type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';

export interface TaskIdParam {
  id: number;
}

export interface TaskInterface extends TaskIdParam {
  cron: CronExpression;
  endpoint: URLEndpoint;
  method: HttpMethod;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
