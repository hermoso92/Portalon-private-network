# Riesgos conocidos y mitigaciones

Estado actual del proyecto (piloto comercial).

---

## Riesgos técnicos

### ALTO
| Riesgo | Descripción | Mitigación |
|--------|-------------|-----------|
| Secret en producción débil | Si JWT_SECRET es corto o predecible, los tokens son vulnerables | Usar `openssl rand -hex 32`, nunca reutilizar el del `.env.example` |
| Sin backup probado | Backup script existe pero no se ha hecho restore real | Probar restore antes del primer cliente real: `gunzip backup.sql.gz | psql...` |
| OpenClaw no disponible | Si el modelo IA cae, los leads llegan sin score | Fallback implementado: score=50, sin bloqueo. Monitorizar disponibilidad |

### MEDIO
| Riesgo | Descripción | Mitigación |
|--------|-------------|-----------|
| VPS single point of failure | Sin redundancia, si cae el VPS cae todo | Snapshot diario del VPS. Plan de recuperación < 1h documentado |
| Sin rate limiting por partner | Un partner puede hacer flood de leads | Throttler global 100 req/min existe. Si necesario, añadir por IP de partner |
| Refresh tokens no invalidados en logout masivo | Si un token robado sigue activo hasta expiración | Logout individual implementado. Logout de todos los dispositivos: pendiente |

### BAJO
| Riesgo | Descripción | Mitigación |
|--------|-------------|-----------|
| Schema Prisma sin índices extra | Queries lentas con >10k leads | Índices en `email`, `status`, `promotionId` ya presentes en schema |
| Sin paginación en algunos endpoints admin | findAll de promotions/partners sin paginar | Dataset pequeño en piloto. Añadir si crece |

---

## Riesgos de negocio

| Riesgo | Descripción | Mitigación |
|--------|-------------|-----------|
| Partner no aprobado intenta operar | Status PENDING rechazado por JwtStrategy | Comportamiento correcto. Mensaje de error claro al partner |
| Comisión duplicada | Reintento de webhook o doble clic | Deduplicación por `(leadId, triggerType)` implementada |
| Lead sin atribución recibe comisión | Lead creado sin `referralCode` ni `partnerId` | `processLeadEvent` retorna si no hay `partnerId` |

---

## Deuda técnica conocida

1. **Sin tests de integración e2e completos** — `test/e2e/app.e2e-spec.ts` básico. Ampliar antes de escalar.
2. **Uploads de assets no implementados** — endpoint pendiente en promotions. Usar CDN externo por ahora.
3. **Sin emails transaccionales** — no se notifica al partner cuando su lead avanza. Añadir en siguiente iteración.
4. **Sin 2FA** — usuarios admin sin segundo factor. Mitigación: contraseñas fuertes + acceso SSH solo por clave.
5. **Swagger deshabilitado en producción** — correcto por seguridad, pero dificulta testing manual en VPS.
