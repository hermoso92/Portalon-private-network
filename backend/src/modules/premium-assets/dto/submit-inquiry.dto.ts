import {
  IsString,
  IsEmail,
  IsOptional,
  IsEnum,
  IsPhoneNumber,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { InquiryType } from '@prisma/client';

export class SubmitInquiryDto {
  @ApiProperty({ description: 'Unit ID the inquiry is about' })
  @IsString()
  unitId: string;

  @ApiProperty({ enum: InquiryType })
  @IsEnum(InquiryType)
  inquiryType: InquiryType;

  @ApiProperty()
  @IsString()
  @MaxLength(100)
  firstName: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  lastName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  country?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  message?: string;

  @ApiPropertyOptional({ description: 'Partner referral code' })
  @IsOptional()
  @IsString()
  referralCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  utmSource?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  utmMedium?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  utmCampaign?: string;
}
