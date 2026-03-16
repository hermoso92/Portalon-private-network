import { IsString, IsEnum, IsNumber, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CommissionTriggerType, CommissionCalculationType } from '@prisma/client';
import { Type } from 'class-transformer';

export class CreateCommissionRuleDto {
  @ApiProperty()
  @IsString()
  promotionId: string;

  @ApiProperty({ enum: CommissionTriggerType })
  @IsEnum(CommissionTriggerType)
  triggerType: CommissionTriggerType;

  @ApiProperty({ enum: CommissionCalculationType })
  @IsEnum(CommissionCalculationType)
  calculationType: CommissionCalculationType;

  @ApiProperty()
  @Type(() => Number)
  @IsNumber()
  amount: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
