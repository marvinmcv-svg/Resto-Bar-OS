import { Module } from '@nestjs/common';
import { KDSController } from './kds.controller';
import { KDSService } from './kds.service';
import { PrismaService } from '../../database/prisma.service';

@Module({
  controllers: [KDSController],
  providers: [KDSService, PrismaService],
  exports: [KDSService],
})
export class KDSModule {}
