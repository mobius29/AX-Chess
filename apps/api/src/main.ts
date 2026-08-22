import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";

import { AppModule } from "./app.module";
import { HttpExceptionFilter } from "./http-exception.filter";
import { requestLogger } from "./request-logger.middleware";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableShutdownHooks();
  app.use(requestLogger);
  app.useGlobalPipes(new ValidationPipe());
  app.useGlobalFilters(new HttpExceptionFilter());

  // Swagger configuration
  const config = new DocumentBuilder().setTitle("AX-Chess").setVersion("0.1").build();
  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("api/docs", app, documentFactory);

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
