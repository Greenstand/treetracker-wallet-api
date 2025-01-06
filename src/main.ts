import { NestFactory } from '@nestjs/core';

import { AppModule } from './modules/app/app.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';

const PORT = process.env.PORT || 3006;

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalFilters(new GlobalExceptionFilter());
  await app.listen(PORT);
}

bootstrap();
