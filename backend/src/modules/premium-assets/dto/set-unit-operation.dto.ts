import { IsOptional, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { OperationMode, AssetStatus } from '@prisma/client';

export class SetUnitOperationDto {
  @ApiPropertyOptional({ enum: OperationMode })
  @IsOptional()
  @IsEnum(OperationMode)
  operationMode?: OperationMode;

  @ApiPropertyOptional({ enum: AssetStatus })
  @IsOptional()
  @IsEnum(AssetStatus)
  assetStatus?: AssetStatus;
}
