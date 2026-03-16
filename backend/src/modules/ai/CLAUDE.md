# AI Module - CLAUDE.md

## Purpose

Provides AI-powered lead intelligence using an Ollama-compatible LLM inference server. Three capabilities: lead classification (scoring), natural language summarization, and risk flag detection. The system is designed for graceful degradation - if the AI server is unavailable, default safe values are returned.

---

## Files

```
ai/
├── ai.module.ts              # Exports AiService
├── ai.service.ts             # High-level operations (classify, summarize, detectRisk)
├── ai-client.service.ts      # HTTP client for Ollama API
└── prompts/
    ├── classifyLead.prompt.ts    # Score 0-100, heat level, buyer type
    ├── summarizeLead.prompt.ts   # Human-readable summary + next action
    └── detectRiskFlags.prompt.ts # Risk flags with severity
```

---

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `OPENCLAW_BASE_URL` | `http://localhost:11434` | Ollama server URL |
| `OPENCLAW_MODEL` | `llama3.1` | Model name |
| `OPENCLAW_TIMEOUT` | `30000` | Timeout ms |

In Docker: use `http://host.docker.internal:11434` to reach host Ollama from container.

---

## Operations

### `classifyLead(lead)` → `LeadClassification`
Returns:
```typescript
{
  score: number;       // 0-100
  heatLevel: 'cold' | 'warm' | 'hot';
  buyerTypeEstimated: string;
  reasoning: string;
}
```
Default (when unavailable): `{ score: 30, heatLevel: 'cold', ... }`

### `summarizeLead(lead)` → `LeadSummary`
Returns:
```typescript
{
  summary: string;
  nextAction: string;
  keyPoints: string[];
}
```

### `detectRiskFlags(lead)` → `LeadRiskFlags`
Returns:
```typescript
{
  flags: Array<{ type: string; severity: 'low'|'medium'|'high'; description: string }>;
  overallRisk: 'low' | 'medium' | 'high';
  requiresManualReview: boolean;
}
```

---

## Integration Pattern

AI scoring is always called **fire-and-forget** from the controller:
```typescript
this.triggerAiScore(lead.id, lead).catch(() => {});
```

The lead is returned to the caller immediately. AI results are applied asynchronously via `leadsService.updateAiScore()`.

All three AI operations run in parallel:
```typescript
const [classification, summary, riskFlags] = await Promise.all([
  this.aiService.classifyLead(leadData),
  this.aiService.summarizeLead(leadData),
  this.aiService.detectRiskFlags(leadData),
]);
```

---

## Graceful Degradation

`AiClientService.isAvailable()` returns `false` if `OPENCLAW_BASE_URL` is not configured or the server ping fails. In that case, all operations return hardcoded defaults - the application works fully without AI.

Errors in individual AI calls are caught with `logger.warn()` and defaults are returned. No errors are propagated to API callers.

---

## Prompt Design

All prompts instruct the model to respond in JSON format only. `parseJsonResponse()` handles extraction of JSON from model responses that may include markdown code blocks or preamble text.

Score validation: `Math.max(0, Math.min(100, Number(result.score) || 30))` - always produces a valid integer.
