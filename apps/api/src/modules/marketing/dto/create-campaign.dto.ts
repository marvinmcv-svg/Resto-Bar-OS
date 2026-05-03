import { IsString, IsOptional, IsArray, IsDateString, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCampaignDto {
  @ApiProperty({ description: 'Campaign name' })
  @IsString()
  name!: string;

  @ApiPropertyOptional({ enum: ['EMAIL', 'SMS', 'PUSH'], default: 'EMAIL' })
  @IsOptional()
  @IsIn(['EMAIL', 'SMS', 'PUSH'])
  type?: 'EMAIL' | 'SMS' | 'PUSH';

  @ApiPropertyOptional({ enum: ['IMMEDIATE', 'SCHEDULED', 'RESERVATION_MADE', 'POST_DINING', 'BIRTHDAY', 'WINBACK_60', 'WINBACK_90'], default: 'IMMEDIATE' })
  @IsOptional()
  @IsIn(['IMMEDIATE', 'SCHEDULED', 'RESERVATION_MADE', 'POST_DINING', 'BIRTHDAY', 'WINBACK_60', 'WINBACK_90'])
  trigger?: 'IMMEDIATE' | 'SCHEDULED' | 'RESERVATION_MADE' | 'POST_DINING' | 'BIRTHDAY' | 'WINBACK_60' | 'WINBACK_90';

  @ApiPropertyOptional({ description: 'Target segments', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  targetSegment?: string[];

  @ApiProperty({ description: 'Email subject' })
  @IsString()
  subject!: string;

  @ApiPropertyOptional({ description: 'Template ID' })
  @IsOptional()
  @IsString()
  templateId?: string;

  @ApiPropertyOptional({ description: 'Content JSON' })
  @IsOptional()
  content?: Record<string, unknown>;

  @ApiPropertyOptional({ description: 'Send at date' })
  @IsOptional()
  @IsDateString()
  sendAt?: string;
}

export class UpdateCampaignDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ enum: ['EMAIL', 'SMS', 'PUSH'] })
  @IsOptional()
  @IsIn(['EMAIL', 'SMS', 'PUSH'])
  type?: 'EMAIL' | 'SMS' | 'PUSH';

  @ApiPropertyOptional({ enum: ['IMMEDIATE', 'SCHEDULED', 'RESERVATION_MADE', 'POST_DINING', 'BIRTHDAY', 'WINBACK_60', 'WINBACK_90'] })
  @IsOptional()
  @IsIn(['IMMEDIATE', 'SCHEDULED', 'RESERVATION_MADE', 'POST_DINING', 'BIRTHDAY', 'WINBACK_60', 'WINBACK_90'])
  trigger?: 'IMMEDIATE' | 'SCHEDULED' | 'RESERVATION_MADE' | 'POST_DINING' | 'BIRTHDAY' | 'WINBACK_60' | 'WINBACK_90';

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  targetSegment?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  templateId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  content?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  sendAt?: string;
}
