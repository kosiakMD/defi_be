import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as dotenv from 'dotenv';

import { AppModule } from './app.module';

// config check
(() => {
	const result = dotenv.config();
	if (result.error) {
		throw result.error;
	} else {
		// eslint-disable-next-line no-console
		console.log(result.parsed);
	}
})();

const service_name = 'Pancake Service';

async function bootstrap() {
	const app = await NestFactory.create<NestExpressApplication>(AppModule, {
		cors: true,
	});

	app.setGlobalPrefix('v1'); // temporary global as only 1 version

	const config = new DocumentBuilder()
		.setTitle(service_name)
		.setDescription(`${service_name} description`)
		.setVersion('1.0') // temporary global as only 1 version
		.build();
	const document = SwaggerModule.createDocument(app, config);
	SwaggerModule.setup('api', app, document);

	const port = process.env.PORT || 3000;
	const host = process.env.HOST || 'localhost';
	await app.listen(port, host);

	// eslint-disable-next-line no-console
	console.log(`${service_name}\nhost:${host}\nport:${port}`);
}

bootstrap();
