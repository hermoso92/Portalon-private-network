export function buildSummarizeLeadPrompt(lead: {
  firstName: string;
  lastName?: string;
  email?: string;
  phone?: string;
  country?: string;
  language?: string;
  budgetRange?: string;
  buyerType?: string;
  interestLevel?: string;
  notes?: string;
  sourceType?: string;
  promotionName?: string;
}): string {
  return `Eres un asistente especializado en resumen comercial de leads inmobiliarios premium.

CONTEXTO: Promoción "${lead.promotionName || 'inmobiliaria premium'}"

DATOS DEL LEAD:
- Nombre: ${lead.firstName} ${lead.lastName || ''}
- País: ${lead.country || 'No indicado'}
- Presupuesto: ${lead.budgetRange || 'No indicado'}
- Tipo comprador: ${lead.buyerType || 'Desconocido'}
- Interés declarado: ${lead.interestLevel || 'No indicado'}
- Canal: ${lead.sourceType || 'Desconocido'}
- Notas: ${lead.notes || 'Ninguna'}

INSTRUCCIONES:
Genera un resumen comercial útil para el equipo de ventas. Responde ÚNICAMENTE con JSON:
{
  "summary": "<resumen en 2-3 frases, útil y accionable para el comercial>",
  "nextAction": "<acción comercial recomendada>",
  "keyPoints": ["<punto clave 1>", "<punto clave 2>"]
}

El resumen debe ser profesional, directo y orientado a facilitar el trabajo del comercial.
Solo responde con el JSON, sin texto adicional.`;
}
