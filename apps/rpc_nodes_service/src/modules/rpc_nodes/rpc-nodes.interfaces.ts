import { NextFunction, Request, Response } from 'express';

export interface IProxyCall {
  request: Request;
  response: Response;
  next: NextFunction;
}
