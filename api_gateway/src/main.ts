import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { AppModule } from './app.module';

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
async function bootstrap() {
	const app = await NestFactory.create<NestExpressApplication>(AppModule, {
		cors: true,
	});

	app.useGlobalPipes(new ValidationPipe());
	app.setGlobalPrefix('v1'); // temporary global as only 1 version

	const { SERVICE_NAME, PORT, HOST } = process.env;

	const config = new DocumentBuilder()
		.setTitle(SERVICE_NAME)
		.setDescription(`${SERVICE_NAME} service description`)
		.setVersion('1.0') // temporary global as only 1 version
		.build();
	const document = SwaggerModule.createDocument(app, config);
	SwaggerModule.setup('api', app, document);

	await app.listen(PORT, HOST);

	console.info(SERVICE_NAME, `\nhost:${HOST}\nport:${PORT}`);
}

bootstrap();
