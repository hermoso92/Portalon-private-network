import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';
import { VisitStatus } from '@prisma/client';

export class UpdateVisitDto {
  @ApiPropertyOptional({ enum: VisitStatus })
  @IsOptional()
  @IsEnum(VisitStatus)
  status?: VisitStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
