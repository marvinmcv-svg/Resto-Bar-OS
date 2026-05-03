import { IsEmail, IsString, MinLength, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'My Restaurant' })
  @IsString() @MinLength(2)
  tenantName!: string;

  @ApiProperty({ example: 'John' })
  @IsString() @MinLength(2)
  firstName!: string;

  @ApiProperty({ example: 'Doe' })
  @IsOptional() @IsString()
  lastName?: string;

  @ApiProperty({ example: 'admin@restaurant.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'Admin123!' })
  @IsString() @MinLength(8)
  password!: string;
}