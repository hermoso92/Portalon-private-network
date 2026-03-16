import {
  IsString,
  IsEmail,
  IsOptional,
  IsEnum,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OwnerType } from '@prisma/client';

export class CreateOwnerDto {
  @ApiProperty({ description: 'Full name of the owner' })
  @IsString()
  @MaxLength(200)
  name: string;

  @ApiProperty({ description: 'Owner email address' })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ description: 'Contact phone number' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  phone?: string;

  @ApiProperty({ enum: OwnerType })
  @IsEnum(OwnerType)
  type: OwnerType;

  @ApiPropertyOptional({ description: 'Tax identification number / NIF / CIF' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  taxId?: string;

  @ApiPropertyOptional({ description: 'Internal notes' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
