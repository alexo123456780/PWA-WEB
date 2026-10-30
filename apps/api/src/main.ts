import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';
import { configureApp } from './setup.js';

const app = await NestFactory.create(AppModule);
configureApp(app);

const docs = SwaggerModule.createDocument(
  app,
  new DocumentBuilder().setTitle('FieldReport API').addBearerAuth().build(),
);
SwaggerModule.setup('api/docs', app, docs);

await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
