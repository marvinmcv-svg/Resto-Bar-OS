import { IsString, IsEmail, IsOptional, IsArray, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { VipTier } from '@prisma/client';

export class UpdateGuestDto {
  @ApiPropertyOptional()
  @IsOptional() @IsString()
  firstName?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  lastName?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  preferredName?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  seatingPref?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  dietaryNotes?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional() @IsArray()
  allergies?: string[];

  @ApiPropertyOptional({ enum: VipTier })
  @IsOptional() @IsEnum(VipTier)
  vipTier?: VipTier;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional() @IsArray()
  tags?: string[];

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  staffNotes?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  emailOptIn?: string;

  @ApiPropertyOptional()
  @IsOptional() @IsString()
  smsOptIn?: string;
}