import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CollectorsController } from './collectors.controller';
import { CollectorsService } from './collectors.service';

@Module({
  imports: [AuthModule],
  controllers: [CollectorsController],
  providers: [CollectorsService],
  exports: [CollectorsService],
})
export class CollectorsModule {}
