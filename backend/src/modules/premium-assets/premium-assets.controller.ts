import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiNoContentResponse,
} from '@nestjs/swagger';
import { UserRole } from '@prisma/client';
import { PremiumAssetsService } from './premium-assets.service';
import { CatalogFilterDto } from './dto/catalog-filter.dto';
import { SetUnitOperationDto } from './dto/set-unit-operation.dto';
import { SubmitInquiryDto } from './dto/submit-inquiry.dto';
import { CreateOwnerDto } from './dto/create-owner.dto';
import { UpdateOwnerDto } from './dto/update-owner.dto';
import { AssignOperatorDto } from './dto/assign-operator.dto';
import { CreateAvailabilityBlockDto } from './dto/create-availability-block.dto';
import { CreatePricingProfileDto } from './dto/create-pricing-profile.dto';
import { UpdatePricingProfileDto } from './dto/update-pricing-profile.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('premium-assets')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('premium-assets')
export class PremiumAssetsController {
  constructor(private readonly service: PremiumAssetsService) {}

  // -----------------------------------------------------------------------
  // PUBLIC CATALOG ENDPOINTS (no auth required)
  // -----------------------------------------------------------------------

  @Public()
  @Get('catalog')
  @ApiOperation({ summary: 'Public asset catalog with optional filtering' })
  getCatalog(@Query() filter: CatalogFilterDto) {
    return this.service.getCatalog(filter);
  }

  @Public()
  @Get('catalog/:id')
  @ApiOperation({ summary: 'Public single asset detail' })
  getCatalogItem(@Param('id') id: string) {
    return this.service.getCatalogItem(id);
  }

  @Public()
  @Post('inquiries')
  @ApiOperation({ summary: 'Submit a public inquiry for an asset' })
  submitInquiry(@Body() dto: SubmitInquiryDto) {
    return this.service.submitInquiry(dto);
  }

  // -----------------------------------------------------------------------
  // ADMIN: UNIT OPERATION
  // -----------------------------------------------------------------------

  @Patch('units/:id/operation')
  @ApiBearerAuth()
  @Roles(UserRole.SUPER_ADMIN, UserRole.PROMOTION_MANAGER)
  @ApiOperation({ summary: 'Set operation mode and/or asset status on a unit' })
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Unit updated' })
  setUnitOperation(
    @Param('id') id: string,
    @Body() dto: SetUnitOperationDto,
  ) {
    return this.service.setUnitOperation(id, dto);
  }

  // -----------------------------------------------------------------------
  // ADMIN: OWNERS
  // -----------------------------------------------------------------------

  @Post('owners')
  @ApiBearerAuth()
  @Roles(UserRole.SUPER_ADMIN, UserRole.PROMOTION_MANAGER)
  @ApiOperation({ summary: 'Create a new asset owner' })
  createOwner(@Body() dto: CreateOwnerDto) {
    return this.service.createOwner(dto);
  }

  @Get('owners')
  @ApiBearerAuth()
  @Roles(UserRole.SUPER_ADMIN, UserRole.PROMOTION_MANAGER, UserRole.SALES_AGENT)
  @ApiOperation({ summary: 'List all asset owners' })
  listOwners() {
    return this.service.listOwners();
  }

  @Put('owners/:id')
  @ApiBearerAuth()
  @Roles(UserRole.SUPER_ADMIN, UserRole.PROMOTION_MANAGER)
  @ApiOperation({ summary: 'Update an asset owner' })
  updateOwner(@Param('id') id: string, @Body() dto: UpdateOwnerDto) {
    return this.service.updateOwner(id, dto);
  }

  // -----------------------------------------------------------------------
  // ADMIN: OPERATOR ASSIGNMENTS
  // -----------------------------------------------------------------------

  @Post('units/:id/operator')
  @ApiBearerAuth()
  @Roles(UserRole.SUPER_ADMIN, UserRole.PROMOTION_MANAGER)
  @ApiOperation({ summary: 'Assign an operator to a unit' })
  assignOperator(@Param('id') id: string, @Body() dto: AssignOperatorDto) {
    return this.service.assignOperator(id, dto);
  }

  // -----------------------------------------------------------------------
  // ADMIN: AVAILABILITY BLOCKS
  // -----------------------------------------------------------------------

  @Get('units/:id/availability')
  @ApiBearerAuth()
  @Roles(UserRole.SUPER_ADMIN, UserRole.PROMOTION_MANAGER, UserRole.SALES_AGENT)
  @ApiOperation({ summary: 'Get availability blocks for a unit' })
  getAvailabilityBlocks(@Param('id') id: string) {
    return this.service.getAvailabilityBlocks(id);
  }

  @Post('units/:id/availability')
  @ApiBearerAuth()
  @Roles(UserRole.SUPER_ADMIN, UserRole.PROMOTION_MANAGER)
  @ApiOperation({ summary: 'Create an availability block for a unit' })
  createAvailabilityBlock(
    @Param('id') id: string,
    @Body() dto: CreateAvailabilityBlockDto,
  ) {
    return this.service.createAvailabilityBlock(id, dto);
  }

  @Delete('availability/:id')
  @ApiBearerAuth()
  @Roles(UserRole.SUPER_ADMIN, UserRole.PROMOTION_MANAGER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Availability block deleted' })
  @ApiOperation({ summary: 'Delete an availability block' })
  deleteAvailabilityBlock(@Param('id') id: string) {
    return this.service.deleteAvailabilityBlock(id);
  }

  // -----------------------------------------------------------------------
  // ADMIN: PRICING PROFILES
  // -----------------------------------------------------------------------

  @Get('units/:id/pricing')
  @ApiBearerAuth()
  @Roles(UserRole.SUPER_ADMIN, UserRole.PROMOTION_MANAGER, UserRole.SALES_AGENT)
  @ApiOperation({ summary: 'Get pricing profiles for a unit' })
  getPricingProfiles(@Param('id') id: string) {
    return this.service.getPricingProfiles(id);
  }

  @Post('units/:id/pricing')
  @ApiBearerAuth()
  @Roles(UserRole.SUPER_ADMIN, UserRole.PROMOTION_MANAGER)
  @ApiOperation({ summary: 'Create a pricing profile for a unit' })
  createPricingProfile(
    @Param('id') id: string,
    @Body() dto: CreatePricingProfileDto,
  ) {
    return this.service.createPricingProfile(id, dto);
  }

  @Patch('pricing/:id')
  @ApiBearerAuth()
  @Roles(UserRole.SUPER_ADMIN, UserRole.PROMOTION_MANAGER)
  @ApiOperation({ summary: 'Update a pricing profile' })
  updatePricingProfile(
    @Param('id') id: string,
    @Body() dto: UpdatePricingProfileDto,
  ) {
    return this.service.updatePricingProfile(id, dto);
  }
}
