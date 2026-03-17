import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PartnerRefreshTokenDto {
  @ApiProperty()
  @IsString()
  refreshToken: string;
}
