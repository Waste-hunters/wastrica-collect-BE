import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { MomoController } from './momo.controller';
import { MomoService } from './momo.service';

@Module({
  imports: [PrismaModule],
  controllers: [MomoController],
  providers: [MomoService],
  exports: [MomoService],
})
export class MomoModule {}
