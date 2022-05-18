import { NextFunction } from 'express';

import { runWithCtx } from '@app/common/helpers/context';

export const withContext = (_req: Request, _res: Response, next: NextFunction) => {
  runWithCtx(async () => next(), {});
};
