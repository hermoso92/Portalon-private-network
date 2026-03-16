import { Module } from '@nestjs/common';
import { PremiumAssetsController } from './premium-assets.controller';
import { PremiumAssetsService } from './premium-assets.service';

@Module({
  controllers: [PremiumAssetsController],
  providers: [PremiumAssetsService],
  exports: [PremiumAssetsService],
})
export class PremiumAssetsModule {}
