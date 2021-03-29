import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';

import PoolDto from '../DTO/Pool.dto';
import { PoolsService } from './pools.service';

@ApiTags('Pools')
@Controller('pools')
export class PoolsController {
	constructor(private service: PoolsService) {}

	@Get()
	@ApiResponse({ status: 200, type: PoolDto, isArray: true })
	@ApiResponse({ status: 500, type: Error })
	async get(@Res() res: Response): Promise<void> {
		// TODO: uncomment
		try {
			const [pools] = await this.service.getAll();
			res.status(HttpStatus.OK).json(pools);
		} catch (e) {
			res.status(HttpStatus.INTERNAL_SERVER_ERROR).json(e);
		}
	}
}
