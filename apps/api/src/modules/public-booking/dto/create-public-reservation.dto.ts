import { IsString, IsDateString, IsInt, Min, IsOptional, IsEmail } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePublicReservationDto {
  @ApiProperty({ example: 'John Doe' })
  @IsString()
  guestName!: string;

  @ApiProperty({ example: 'john@example.com' })
  @IsEmail()
  guestEmail!: string;

  @ApiProperty({ example: '+1 555-1234' })
  @IsString()
  guestPhone!: string;

  @ApiProperty({ example: '2025-06-15' })
  @IsDateString()
  date!: string;

  @ApiProperty({ example: '19:30' })
  @IsString()
  time!: string;

  @ApiProperty({ example: 4 })
  @IsInt() @Min(1)
  partySize!: number;

  @ApiPropertyOptional({ example: 'birthday' })
  @IsOptional() @IsString()
  occasion?: string;

  @ApiPropertyOptional({ example: 'Window seat preferred' })
  @IsOptional() @IsString()
  notes?: string;
}
