import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as dotenv from 'dotenv';

import { AppModule } from './app.module';

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
(() => {
	const result = dotenv.config();
	if (result.error) {
		throw result.error;
	} else {
		console.info('config', result.parsed);
	}
})();

const service_name = 'API Gateway';

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
async function bootstrap() {
	const app = await NestFactory.create<NestExpressApplication>(AppModule, {
		cors: true,
	});

	app.useGlobalPipes(new ValidationPipe());
	app.setGlobalPrefix('v1'); // temporary global as only 1 version

	const config = new DocumentBuilder()
		.setTitle(service_name)
		.setDescription(`${service_name} service description`)
		.setVersion('1.0') // temporary global as only 1 version
		.build();
	const document = SwaggerModule.createDocument(app, config);
	SwaggerModule.setup('api', app, document);

	const port = process.env.PORT || 3000;
	const host = process.env.HOST;
	await app.listen(port, host);

	// eslint-disable-next-line no-console
	console.log(`${service_name}\nhost:${host}\nport:${port}`);
}

bootstrap();
