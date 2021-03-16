import { Module } from '@nestjs/common';
import { ExamplesModule } from './examples/example.module';

@Module({
    imports: [ExamplesModule],
})
export class AppModule {}
