import { Module } from '@nestjs/common';
import { AiService } from './ai.service';
import { AiClientService } from './ai-client.service';

@Module({
  providers: [AiService, AiClientService],
  exports: [AiService],
})
export class AiModule {}
