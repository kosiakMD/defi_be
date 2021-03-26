import { Controller, Get } from '@nestjs/common';
import { ApiResponse, ApiTags } from '@nestjs/swagger';
import { Pool } from '../interfaces';
import PoolDto from '../DTO/Pool.dto';

@ApiTags('Pools')
@Controller('pools')
export class PoolsController {
	@Get()
	@ApiResponse({ status: 200, type: PoolDto, isArray: true })
	get(): Pool[] {
		const pool = new PoolDto();
		return [pool];
	}
}
