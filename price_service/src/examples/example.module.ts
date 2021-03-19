import { Module } from '@nestjs/common';
import { ExamplesController } from './example.controller';
import { ExamplesService } from './example.service';

@Module({
	controllers: [ExamplesController],
	providers: [ExamplesService],
})
export class ExamplesModule {}
