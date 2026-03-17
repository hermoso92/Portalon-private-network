import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsString } from 'class-validator';

export class CreateVisitDto {
  @ApiProperty({ description: 'Lead ID' })
  @IsString()
  leadId: string;

  @ApiPropertyOptional({ description: 'Unit ID' })
  @IsOptional()
  @IsString()
  unitId?: string;

  @ApiProperty({ description: 'Scheduled date-time (ISO 8601)' })
  @IsDateString()
  scheduledAt: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
