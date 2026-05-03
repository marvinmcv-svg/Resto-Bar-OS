import { Module } from '@nestjs/common';
import { FloorController } from './floor.controller';
import { FloorService } from './floor.service';
import { PrismaService } from '../../database/prisma.service';

@Module({
  controllers: [FloorController],
  providers: [FloorService, PrismaService],
})
export class FloorModule {}
