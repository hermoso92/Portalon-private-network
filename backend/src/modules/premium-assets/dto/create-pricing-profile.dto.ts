import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsBoolean,
  IsInt,
  Min,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { OperationMode, PriceUnit } from '@prisma/client';

export class CreatePricingProfileDto {
  @ApiProperty({ enum: OperationMode })
  @IsEnum(OperationMode)
  operationMode: OperationMode;

  @ApiProperty({ description: 'Base price amount' })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  basePrice: number;

  @ApiPropertyOptional({ description: 'Currency code (ISO 4217)', default: 'EUR' })
  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @ApiProperty({ enum: PriceUnit })
  @IsEnum(PriceUnit)
  priceUnit: PriceUnit;

  @ApiPropertyOptional({ description: 'Minimum stay in nights/months depending on mode' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  minStay?: number;

  @ApiPropertyOptional({ description: 'Maximum stay in nights/months depending on mode' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxStay?: number;

  @ApiPropertyOptional({ description: 'Internal notes' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @ApiPropertyOptional({ description: 'Whether this pricing profile is active', default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
