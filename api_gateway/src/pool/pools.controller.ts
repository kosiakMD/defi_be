import { Controller, Get, Res } from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { AxiosResponse } from 'axios';
import { Response } from 'express';

import PoolDto from '../DTO/Pool.dto';
import { Pool } from '../interfaces';
import { PoolsService } from './pools.service';

@ApiTags('Pools')
@Controller('pools')
export class PoolsController {
	constructor(private service: PoolsService) {}

	@Get()
	@ApiResponse({ status: 200, type: PoolDto, isArray: true })
	async get(@Res() res: Response): Promise<Pool[]> {
		console.log('get');
		// const pool = new PoolDto();
		// return [pool];
		// const pools = await new PoolsService().getAll();
		// let pools = [];
		try {
			const result = await this.service.getAll();
			// console.log('result', result);
			return result;
		} catch (e) {
			console.log('error', e);
		}
		// res.status(HttpStatus.OK).json(resp.data);
		// console.log('poolsObserve', poolsObserve)
		// console.log('as', as)
		// console.log('pools', pools);
		// @ts-ignore
		// res.status(HttpStatus.OK);
		// return pools;
		return [];
	}
}
