import { plainToClass } from 'class-transformer';
import { firstValueFrom } from 'rxjs';

import { HttpService } from '@nestjs/axios';
import { Inject, Injectable } from '@nestjs/common';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

import { Logger } from '../../../../../../../jobs/lambda_vaults/src/logger/logger.service';
import { Instructions } from '../models';

@Injectable()
export class HandlerSubgraph {
  constructor(
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: Logger,
    private readonly httpService: HttpService,
  ) {}

  async handle(_instructions) {
    this.logger.debug('-----------------handle start----------------------');
    const instructions: Instructions = plainToClass(Instructions, _instructions);

    console.log(JSON.stringify(instructions, null, 4));

    const collectedData = {
      calls: [],
    };
    for (const call of instructions.calls) {
      const response$ = this.httpService.post(instructions.context.subgraphUrl, {
        variables: call.variables,
        query: call.query,
      });
      const response = await firstValueFrom(response$);
      collectedData.calls.push(response.data.data);
    }

    console.log(JSON.stringify(collectedData, null, 4));

    const result = Object.keys(instructions.fieldsMapping).reduce((acc, field) => {
      const path = instructions.fieldsMapping[field];
      acc[field] = this.deepFind(collectedData, path);
      return acc;
    }, {});

    console.log(JSON.stringify(result, null, 4));

    this.logger.debug('--------------------handle end--------------------');
    return result;
  }

  deepFind(obj, path) {
    const paths = path.split('.');
    let current = obj;

    for (let i = 0; i < paths.length; ++i) {
      if (paths[i].endsWith('[]')) {
        const f = paths[i].substr(0, paths[i].length - 2);
        if (Array.isArray(current[f])) {
          const p = paths.slice(i + 1).join('.');
          return current[f].map((o) => this.deepFind(o, p));
        }
        return undefined;
      }
      if (current[paths[i]] === undefined) {
        return undefined;
      }
      current = current[paths[i]];
    }
    return current;
  }
}
