import { Injectable, Logger } from '@nestjs/common';
import { AiClientService } from './ai-client.service';
import { buildClassifyLeadPrompt } from './prompts/classifyLead.prompt';
import { buildSummarizeLeadPrompt } from './prompts/summarizeLead.prompt';
import { buildDetectRiskFlagsPrompt } from './prompts/detectRiskFlags.prompt';

export interface LeadClassification {
  score: number;
  heatLevel: 'cold' | 'warm' | 'hot';
  buyerTypeEstimated: string;
  reasoning: string;
}

export interface LeadSummary {
  summary: string;
  nextAction: string;
  keyPoints: string[];
}

export interface LeadRiskFlags {
  flags: Array<{
    type: string;
    severity: 'low' | 'medium' | 'high';
    description: string;
  }>;
  overallRisk: 'low' | 'medium' | 'high';
  requiresManualReview: boolean;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(private readonly aiClient: AiClientService) {}

  async classifyLead(lead: any): Promise<LeadClassification> {
    const defaultResult: LeadClassification = {
      score: 30,
      heatLevel: 'cold',
      buyerTypeEstimated: 'UNKNOWN',
      reasoning: 'Clasificación por defecto - servicio AI no disponible',
    };

    if (!this.aiClient.isAvailable()) {
      return defaultResult;
    }

    try {
      const prompt = buildClassifyLeadPrompt(lead);
      const response = await this.aiClient.complete({ prompt, temperature: 0.1 });
      const result = this.aiClient.parseJsonResponse<LeadClassification>(response.content);

      // Validate and sanitize
      return {
        score: Math.max(0, Math.min(100, Number(result.score) || 30)),
        heatLevel: ['cold', 'warm', 'hot'].includes(result.heatLevel) ? result.heatLevel : 'cold',
        buyerTypeEstimated: result.buyerTypeEstimated || 'UNKNOWN',
        reasoning: result.reasoning || '',
      };
    } catch (error) {
      this.logger.warn(`classifyLead failed: ${error.message}`);
      return defaultResult;
    }
  }

  async summarizeLead(lead: any): Promise<LeadSummary> {
    const defaultResult: LeadSummary = {
      summary: `Lead de ${lead.firstName} ${lead.lastName || ''} sin resumen disponible.`,
      nextAction: 'Contactar para calificar',
      keyPoints: [],
    };

    if (!this.aiClient.isAvailable()) {
      return defaultResult;
    }

    try {
      const prompt = buildSummarizeLeadPrompt(lead);
      const response = await this.aiClient.complete({ prompt, temperature: 0.2 });
      const result = this.aiClient.parseJsonResponse<LeadSummary>(response.content);

      return {
        summary: result.summary || defaultResult.summary,
        nextAction: result.nextAction || defaultResult.nextAction,
        keyPoints: Array.isArray(result.keyPoints) ? result.keyPoints : [],
      };
    } catch (error) {
      this.logger.warn(`summarizeLead failed: ${error.message}`);
      return defaultResult;
    }
  }

  async detectRiskFlags(lead: any): Promise<LeadRiskFlags> {
    const defaultResult: LeadRiskFlags = {
      flags: [],
      overallRisk: 'low',
      requiresManualReview: false,
    };

    if (!this.aiClient.isAvailable()) {
      return defaultResult;
    }

    try {
      const prompt = buildDetectRiskFlagsPrompt(lead);
      const response = await this.aiClient.complete({ prompt, temperature: 0.1 });
      const result = this.aiClient.parseJsonResponse<LeadRiskFlags>(response.content);

      return {
        flags: Array.isArray(result.flags) ? result.flags : [],
        overallRisk: ['low', 'medium', 'high'].includes(result.overallRisk)
          ? result.overallRisk
          : 'low',
        requiresManualReview: Boolean(result.requiresManualReview),
      };
    } catch (error) {
      this.logger.warn(`detectRiskFlags failed: ${error.message}`);
      return defaultResult;
    }
  }
}
