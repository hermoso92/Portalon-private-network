export function buildDetectRiskFlagsPrompt(lead: {
  firstName: string;
  lastName?: string;
  email?: string;
  phone?: string;
  country?: string;
  budgetRange?: string;
  notes?: string;
  sourceType?: string;
}): string {
  return `Eres un especialista en detección de riesgos en leads inmobiliarios.

DATOS DEL LEAD:
- Nombre: ${lead.firstName} ${lead.lastName || ''}
- Email: ${lead.email || 'No proporcionado'}
- Teléfono: ${lead.phone || 'No proporcionado'}
- País: ${lead.country || 'No indicado'}
- Presupuesto: ${lead.budgetRange || 'No indicado'}
- Canal de entrada: ${lead.sourceType || 'Desconocido'}
- Notas: ${lead.notes || 'Ninguna'}

INSTRUCCIONES:
Detecta posibles flags de riesgo. Responde ÚNICAMENTE con JSON:
{
  "flags": [
    {
      "type": "<tipo de riesgo>",
      "severity": "<low|medium|high>",
      "description": "<descripción breve>"
    }
  ],
  "overallRisk": "<low|medium|high>",
  "requiresManualReview": <true|false>
}

TIPOS DE RIESGO A DETECTAR:
- incomplete_contact: Datos de contacto insuficientes
- suspicious_budget: Presupuesto inconsistente con el producto
- low_engagement: Señales de bajo interés real
- duplicate_risk: Posible lead duplicado o sintético
- language_mismatch: Idioma/país inconsistente
- spam_pattern: Patrones de spam o bot

Si no hay flags, retorna flags: []
Solo responde con el JSON, sin texto adicional.`;
}
