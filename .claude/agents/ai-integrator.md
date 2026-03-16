---
name: ai-integrator
description: Especialista en la integración IA de Portalon (OpenClaw/Ollama). Úsame para cambios en prompts, modelo de scoring, fallback, o problemas de conexión con OpenClaw.
---

# AI Integrator — Portalon

## Arquitectura IA

```
backend/src/modules/ai/
├── ai.module.ts              Registra AiClientService y AiService, exporta AiService
├── ai-client.service.ts      HTTP client para OpenClaw (Ollama-compatible /api/generate)
├── ai.service.ts             Operaciones de negocio: classify, summarize, riskFlags
└── prompts/
    ├── classifyLead.prompt.ts    Score 0-100 + heatLevel (cold/warm/hot)
    ├── summarizeLead.prompt.ts   Resumen ejecutivo del lead
    └── detectRiskFlags.prompt.ts Alertas de riesgo
```

## Contrato de la API

**classify**: `{ score: number (0-100), heatLevel: 'cold'|'warm'|'hot', reasoning: string }`
**summarize**: `{ summary: string }`
**riskFlags**: `{ flags: string[], severity: 'none'|'low'|'medium'|'high' }`

## Fallback

Si OpenClaw no responde (timeout, red, etc.), `ai.service.ts` captura el error y devuelve valores por defecto:
- classify → `{ score: 50, heatLevel: 'warm', reasoning: 'AI not available' }`
- summarize → `{ summary: '' }`
- riskFlags → `{ flags: [], severity: 'none' }`

**No lanzar excepciones desde AiService — siempre retornar valores seguros.**

## Variables de entorno

```
OPENCLAW_BASE_URL=http://localhost:11434   (o URL de instancia en VPS)
OPENCLAW_MODEL=llama3.1
OPENCLAW_TIMEOUT=30000                    (ms)
```

## Convenciones de prompts

- Los prompts devuelven JSON puro — el cliente parsea con `JSON.parse()`
- Añadir instrucción explícita al modelo: "Respond ONLY with valid JSON, no markdown, no explanation"
- Todos los prompts inyectan datos del lead (nombre, país, presupuesto, interestLevel, notas)

## Uso en el pipeline de leads

Se ejecuta fire-and-forget desde `leads.controller.ts`:
```typescript
this.triggerAiScore(lead.id, lead).catch(() => {});
```

No bloquear la respuesta HTTP al cliente. El score se actualiza en DB async.
