import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import * as dotenv from 'dotenv';

const result = dotenv.config();

if (result.error) {
	throw result.error;
}

// eslint-disable-next-line no-console
console.log(result.parsed);

async function bootstrap() {
	const app = await NestFactory.create<NestExpressApplication>(AppModule);
	app.enableCors();

	const config = new DocumentBuilder()
		.setTitle('Account Service')
		.setDescription('The Account Service API description')
		.setVersion('1.0')
		.addTag('account_service')
		.build();
	const document = SwaggerModule.createDocument(app, config);
	SwaggerModule.setup('api', app, document);

	const port = process.env.PORT || 3000;
	const host = process.env.HOST;
	await app.listen(port, host);

	// eslint-disable-next-line no-console
	console.log(`http://${host}:${port}`);
}

bootstrap();
