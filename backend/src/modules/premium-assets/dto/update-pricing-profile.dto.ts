import { PartialType } from '@nestjs/swagger';
import { CreatePricingProfileDto } from './create-pricing-profile.dto';

export class UpdatePricingProfileDto extends PartialType(CreatePricingProfileDto) {}
