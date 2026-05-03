import { IsEnum, IsString, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ReservationStatus } from '@prisma/client';

export class ChangeStatusDto {
  @ApiPropertyOptional({ enum: ReservationStatus })
  @IsEnum(ReservationStatus)
  status!: ReservationStatus;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  reason?: string;
}