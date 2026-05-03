import { IsDateString, IsInt, Min, IsOptional, IsEnum, IsUUID, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ReservationStatus } from '@prisma/client';

export class UpdateReservationDto {
  @ApiPropertyOptional()
  @IsOptional() @IsDateString()
  date?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  time?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsInt() @Min(1)
  partySize?: number;

  @ApiPropertyOptional()
  @IsOptional() @IsUUID()
  tableId?: string;

  @ApiPropertyOptional({ enum: ReservationStatus })
  @IsOptional() @IsEnum(ReservationStatus)
  status?: ReservationStatus;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  notes?: string;
}