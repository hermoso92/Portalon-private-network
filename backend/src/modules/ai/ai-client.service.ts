import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';

export interface AiCompletionRequest {
  prompt: string;
  temperature?: number;
  maxTokens?: number;
}

export interface AiCompletionResponse {
  content: string;
  model: string;
}

@Injectable()
export class AiClientService {
  private readonly logger = new Logger(AiClientService.name);
  private readonly client: AxiosInstance;
  private readonly model: string;
  private readonly baseUrl: string;

  constructor(private configService: ConfigService) {
    this.baseUrl = configService.get<string>('OPENCLAW_BASE_URL', 'http://localhost:11434');
    this.model = configService.get<string>('OPENCLAW_MODEL', 'llama3.1');
    const timeout = configService.get<number>('OPENCLAW_TIMEOUT', 30000);

    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  async complete(request: AiCompletionRequest): Promise<AiCompletionResponse> {
    try {
      // Compatible with Ollama API (OpenClaw is Ollama-compatible)
      const response = await this.client.post('/api/generate', {
        model: this.model,
        prompt: request.prompt,
        stream: false,
        options: {
          temperature: request.temperature ?? 0.1,
          num_predict: request.maxTokens ?? 512,
        },
      });

      return {
        content: response.data.response,
        model: response.data.model,
      };
    } catch (error) {
      this.logger.error(
        `OpenClaw request failed: ${error.message}`,
        error.response?.data,
      );
      throw new Error(`AI service unavailable: ${error.message}`);
    }
  }

  parseJsonResponse<T>(content: string): T {
    // Extract JSON from response (model may add extra text)
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in AI response');
    }

    try {
      return JSON.parse(jsonMatch[0]) as T;
    } catch (e) {
      throw new Error(`Invalid JSON in AI response: ${e.message}`);
    }
  }

  isAvailable(): boolean {
    return !!this.baseUrl && !!this.model;
  }
}
