import { Module } from '@nestjs/common';
import { GuestsController } from './guests.controller';
import { GuestsService } from './guests.service';
import { PrismaService } from '../../database/prisma.service';

@Module({
  controllers: [GuestsController],
  providers: [GuestsService, PrismaService],
  exports: [GuestsService],
})
export class GuestsModule {}