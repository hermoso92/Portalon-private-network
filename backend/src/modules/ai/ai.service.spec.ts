import { Test, TestingModule } from '@nestjs/testing';
import { AiService } from './ai.service';
import { AiClientService } from './ai-client.service';

const mockAiClient = {
  complete: jest.fn(),
  parseJsonResponse: jest.fn(),
  isAvailable: jest.fn().mockReturnValue(true),
};

const mockLead = {
  firstName: 'Carlos',
  lastName: 'García',
  email: 'carlos@test.com',
  phone: '+34 666 123 456',
  country: 'España',
  language: 'es',
  budgetRange: '200000-300000',
  buyerType: 'INVESTOR',
  interestLevel: 'high',
  notes: 'Interesado en inversión turística',
  sourceType: 'PARTNER_REFERRAL',
};

describe('AiService', () => {
  let service: AiService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiService,
        { provide: AiClientService, useValue: mockAiClient },
      ],
    }).compile();

    service = module.get<AiService>(AiService);
    jest.clearAllMocks();
    mockAiClient.isAvailable.mockReturnValue(true);
  });

  describe('classifyLead', () => {
    it('should classify a lead successfully', async () => {
      mockAiClient.complete.mockResolvedValue({ content: '{"score":75,"heatLevel":"hot","buyerTypeEstimated":"INVESTOR","reasoning":"High budget investor"}' });
      mockAiClient.parseJsonResponse.mockReturnValue({
        score: 75,
        heatLevel: 'hot',
        buyerTypeEstimated: 'INVESTOR',
        reasoning: 'High budget investor',
      });

      const result = await service.classifyLead(mockLead);

      expect(result.score).toBe(75);
      expect(result.heatLevel).toBe('hot');
      expect(result.buyerTypeEstimated).toBe('INVESTOR');
    });

    it('should return default when AI client not available', async () => {
      mockAiClient.isAvailable.mockReturnValue(false);

      const result = await service.classifyLead(mockLead);

      expect(result.score).toBe(30);
      expect(result.heatLevel).toBe('cold');
    });

    it('should return default on AI error', async () => {
      mockAiClient.complete.mockRejectedValue(new Error('Connection refused'));

      const result = await service.classifyLead(mockLead);

      expect(result.score).toBe(30);
      expect(result.heatLevel).toBe('cold');
    });

    it('should clamp score to 0-100 range', async () => {
      mockAiClient.complete.mockResolvedValue({ content: '{}' });
      mockAiClient.parseJsonResponse.mockReturnValue({
        score: 150,
        heatLevel: 'hot',
        buyerTypeEstimated: 'INVESTOR',
      });

      const result = await service.classifyLead(mockLead);

      expect(result.score).toBeLessThanOrEqual(100);
      expect(result.score).toBeGreaterThanOrEqual(0);
    });
  });

  describe('detectRiskFlags', () => {
    it('should detect risk flags', async () => {
      mockAiClient.complete.mockResolvedValue({ content: '{}' });
      mockAiClient.parseJsonResponse.mockReturnValue({
        flags: [{ type: 'incomplete_contact', severity: 'low', description: 'No phone number' }],
        overallRisk: 'low',
        requiresManualReview: false,
      });

      const result = await service.detectRiskFlags(mockLead);

      expect(result.flags).toHaveLength(1);
      expect(result.overallRisk).toBe('low');
    });

    it('should return empty flags on error', async () => {
      mockAiClient.complete.mockRejectedValue(new Error('Timeout'));

      const result = await service.detectRiskFlags(mockLead);

      expect(result.flags).toHaveLength(0);
      expect(result.requiresManualReview).toBe(false);
    });
  });
});
