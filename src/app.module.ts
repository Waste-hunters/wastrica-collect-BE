import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { CollectorsModule } from './collectors/collectors.module';
import { CompaniesModule } from './companies/companies.module';
import { HouseholdsModule } from './households/households.module';
import { PrismaModule } from './prisma/prisma.module';
import { RoutesModule } from './routes/routes.module';
import { UsersModule } from './users/users.module';
import { BillingModule } from './billing/billing.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    CompaniesModule,
    UsersModule,
    CollectorsModule,
    HouseholdsModule,
    RoutesModule,
    BillingModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
