import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { VipTier } from '@prisma/client';

export class SearchGuestDto {
  @ApiPropertyOptional({ description: 'Search by name, email, or phone' })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ enum: VipTier })
  @IsOptional()
  @IsEnum(VipTier)
  tier?: VipTier;

  @ApiPropertyOptional({ type: String })
  @IsOptional()
  @IsString()
  tag?: string;
}