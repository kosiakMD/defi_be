import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as dotenv from 'dotenv';

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

const service_name = 'API Gateway';

async function bootstrap() {
	const app = await NestFactory.create<NestExpressApplication>(AppModule, {
		cors: true,
	});

	const config = new DocumentBuilder()
		.setTitle(service_name)
		.setDescription(`${service_name} API description`)
		.setVersion('1.0')
		.addTag('services')
		.build();
	const document = SwaggerModule.createDocument(app, config);
	SwaggerModule.setup('api', app, document);

	const port = process.env.PORT || 3000;
	const host = process.env.HOST; /*|| 'localhost'*/
	await app.listen(port, host);

	// eslint-disable-next-line no-console
	console.log(`${service_name}\nhost:${host}\nport:${port}`);
}

bootstrap();
