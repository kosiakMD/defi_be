import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { AppModule } from './app.module';

const serviceName = 'Integration Service';

async function bootstrap() {
	const app = await NestFactory.create<NestExpressApplication>(AppModule, {
		cors: true,
	});

	app.useGlobalPipes(new ValidationPipe());
	app.setGlobalPrefix('v1'); // temporary global as only 1 version

	const { PORT, HOST } = process.env;

	const config = new DocumentBuilder()
		.setTitle(serviceName)
		.setDescription(`${serviceName} description`)
		.setVersion('1.0') // temporary global as only 1 version
		.build();

	const document = SwaggerModule.createDocument(app, config);
	SwaggerModule.setup('api', app, document);

	await app.listen(PORT, HOST);

	// eslint-disable-next-line no-console
	console.log(`${serviceName}\nhost:${HOST}\nport:${PORT}`);
}

bootstrap();
