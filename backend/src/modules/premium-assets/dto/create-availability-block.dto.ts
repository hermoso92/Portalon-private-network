import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AvailabilityBlockReason } from '@prisma/client';

export class CreateAvailabilityBlockDto {
  @ApiProperty({ description: 'Block start date (ISO 8601)' })
  @IsDateString()
  startDate: string;

  @ApiProperty({ description: 'Block end date (ISO 8601)' })
  @IsDateString()
  endDate: string;

  @ApiProperty({ enum: AvailabilityBlockReason })
  @IsEnum(AvailabilityBlockReason)
  reason: AvailabilityBlockReason;

  @ApiPropertyOptional({ description: 'Optional notes about this block' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;
}
