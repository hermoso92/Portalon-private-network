import { IsOptional, IsEnum, IsInt, IsString, Min, Max } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { OperationMode, AssetStatus } from '@prisma/client';

export class CatalogFilterDto {
  @ApiPropertyOptional({ enum: OperationMode })
  @IsOptional()
  @IsEnum(OperationMode)
  operationMode?: OperationMode;

  @ApiPropertyOptional({
    enum: AssetStatus,
    description: 'Filter by asset status. If omitted, OFF_MARKET assets are excluded.',
  })
  @IsOptional()
  @IsEnum(AssetStatus)
  assetStatus?: AssetStatus;

  @ApiPropertyOptional({ description: 'Filter by promotion ID' })
  @IsOptional()
  @IsString()
  promotionId?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}
