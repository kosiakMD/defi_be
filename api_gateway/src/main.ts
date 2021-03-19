import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as dotenv from 'dotenv';

const result = dotenv.config();

if (result.error) {
	throw result.error;
}

// eslint-disable-next-line no-console
console.log(result.parsed);

async function bootstrap() {
	const app = await NestFactory.create<NestExpressApplication>(AppModule, {
		cors: true,
	});

	const config = new DocumentBuilder()
		.setTitle('Services example')
		.setDescription('The services API description')
		.setVersion('1.0')
		.addTag('services')
		.build();
	const document = SwaggerModule.createDocument(app, config);
	SwaggerModule.setup('api', app, document);

	const port = process.env.PORT || 3000;
	const host = process.env.HOST; /*|| 'localhost'*/
	await app.listen(port, host);

	// eslint-disable-next-line no-console
	console.log(`Listening: http://${host}:${port}`);
}

bootstrap();
