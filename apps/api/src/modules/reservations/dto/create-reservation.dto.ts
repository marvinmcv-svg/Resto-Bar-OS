import { IsString, IsDateString, IsInt, Min, IsOptional, IsEnum, IsEmail, IsBoolean, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BookingType } from '@prisma/client';

export class CreateReservationDto {
  @ApiProperty({ example: 'John' })
  @IsString() @IsOptional()
  guestFirstName!: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  guestLastName?: string;

  @ApiPropertyOptional({ example: 'john@example.com' })
  @IsOptional() @IsEmail()
  guestEmail?: string;

  @ApiPropertyOptional({ example: '+1 555-1234' })
  @IsOptional() @IsString()
  guestPhone?: string;

  @ApiProperty({ example: '2025-06-15' })
  @IsDateString()
  date!: string;

  @ApiProperty({ example: '19:30' })
  @IsString()
  time!: string;

  @ApiProperty({ example: 4 })
  @IsInt() @Min(1)
  partySize!: number;

  @ApiPropertyOptional()
  @IsOptional() @IsUUID()
  tableId?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  tablePref?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  occasion?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  occasionNote?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  notes?: string;

  @ApiPropertyOptional({ enum: BookingType })
  @IsOptional() @IsEnum(BookingType)
  bookingType?: BookingType;

  @ApiPropertyOptional()
  @IsOptional() @IsBoolean()
  depositRequired?: boolean;
}