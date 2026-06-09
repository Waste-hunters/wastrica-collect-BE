import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('collect/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('Wastrica Collect API')
    .setDescription(
      [
        'Backend API for Wastrica Collect, a waste payment automation platform for Rwanda.',
        '',
        'Implemented modules in this slice:',
        '- Auth: OTP challenges and JWT login.',
        '- Companies: company workspace onboarding and settings.',
        '- Users & Roles: staff invitation, role assignment, and activation flow.',
        '- Collectors: field staff onboarding and performance summary.',
        '- Households: household registration, verification, status, and fee history.',
        '- Routes: route creation, household assignment, and collector route maps.',
        '- Billing: billing periods, charge generation, household balance and payment status.',
      ].join('\n'),
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'method',
    },
  });

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
