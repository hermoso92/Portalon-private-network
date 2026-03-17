import { IsEmail, IsOptional, IsString, Length, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'admin@portalon.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiPropertyOptional({ description: 'TOTP code (required only if 2FA is enabled)', example: '123456' })
  @IsOptional()
  @IsString()
  @Length(6, 6)
  totpCode?: string;
}
