import {
  IsString,
  IsEmail,
  IsOptional,
  IsDateString,
  IsNumber,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class AssignOperatorDto {
  @ApiProperty({ description: 'Name of the operator / management company' })
  @IsString()
  @MaxLength(200)
  operatorName: string;

  @ApiProperty({ description: 'Operator contact email' })
  @IsEmail()
  operatorEmail: string;

  @ApiPropertyOptional({ description: 'Operator contact phone' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  operatorPhone?: string;

  @ApiProperty({ description: 'Assignment start date (ISO 8601)' })
  @IsDateString()
  startDate: string;

  @ApiPropertyOptional({ description: 'Assignment end date (ISO 8601), omit for open-ended' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({
    description: 'Commission rate as a decimal fraction (e.g. 0.15 for 15%)',
    minimum: 0,
    maximum: 1,
  })
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  commissionRate: number;

  @ApiPropertyOptional({ description: 'Internal notes' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
