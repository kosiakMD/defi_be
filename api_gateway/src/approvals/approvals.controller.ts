import { Controller, Get, Param } from '@nestjs/common';

@Controller('approvals')
export class ApprovalsController {
	@Get(':address')
	findAll(@Param('address') address: string): string {
		return `${address}`;
	}
}
