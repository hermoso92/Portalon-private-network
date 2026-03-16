export function buildClassifyLeadPrompt(lead: {
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
}): string {
  return `Eres un asistente especializado en análisis de leads inmobiliarios premium.

Analiza el siguiente lead y proporciona una clasificación comercial.

DATOS DEL LEAD:
- Nombre: ${lead.firstName} ${lead.lastName || ''}
- Email: ${lead.email || 'No proporcionado'}
- Teléfono: ${lead.phone || 'No proporcionado'}
- País: ${lead.country || 'No indicado'}
- Idioma: ${lead.language || 'No indicado'}
- Rango de presupuesto: ${lead.budgetRange || 'No indicado'}
- Tipo de comprador declarado: ${lead.buyerType || 'Desconocido'}
- Nivel de interés declarado: ${lead.interestLevel || 'No indicado'}
- Canal de entrada: ${lead.sourceType || 'Desconocido'}
- Notas adicionales: ${lead.notes || 'Ninguna'}

INSTRUCCIONES:
Responde ÚNICAMENTE con un objeto JSON válido con esta estructura exacta:
{
  "score": <número entero del 0 al 100>,
  "heatLevel": "<cold|warm|hot>",
  "buyerTypeEstimated": "<INVESTOR|END_USER|DEVELOPER|CORPORATE|UNKNOWN>",
  "reasoning": "<breve explicación de 1-2 frases>"
}

CRITERIOS DE PUNTUACIÓN:
- 0-30: Lead frío, información incompleta, bajo interés aparente
- 31-60: Lead templado, información básica, interés moderado
- 61-80: Lead cálido, buena información, interés claro
- 81-100: Lead caliente, información completa, alta intención de compra

Solo responde con el JSON, sin texto adicional.`;
}
