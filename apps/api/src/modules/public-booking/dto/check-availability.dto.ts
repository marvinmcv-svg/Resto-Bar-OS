import { IsDateString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CheckAvailabilityDto {
  @ApiProperty({ example: '2025-06-15' })
  @IsDateString()
  date!: string;

  @ApiProperty({ example: 4 })
  @Type(() => Number)
  @IsInt() @Min(1)
  partySize!: number;
}
