# Auditoría Técnica Completa — Portalon Private Network
**Fecha**: Marzo 2026 | **Auditor**: Arquitecto Senior / Especialista SaaS Inmobiliario
**Metodología**: Revisión completa de código fuente, schema de base de datos, infraestructura y documentación. Análisis como si se fuera a invertir capital real en el proyecto.

---

## RESUMEN EJECUTIVO

Portalon es un CRM inmobiliario con sistema de afiliación comercial que ha llegado al ~65% de un MVP real. El núcleo del pipeline (leads → atribución → comisiones) está bien diseñado. La infraestructura base es correcta. Pero hay una brecha enorme entre lo que existe en el repositorio y lo que se describe como visión del producto: **el portal del comprador no existe en absoluto**, la IA no genera nada visual, no hay ningún sistema de notificaciones, y hay bugs de integridad de datos en producción.

**Veredicto de inversión**: El proyecto tiene fundamentos sólidos pero requiere 6-8 semanas de trabajo focalizado antes de poder ponerse en producción con un cliente real. No es un proyecto en riesgo, pero sí uno que sobreestima su estado actual.

---

## 1. ARQUITECTURA GENERAL

### ¿Es sólida para escalar una plataforma SaaS inmobiliaria?

**Stack**: NestJS 10 + Next.js 14 App Router + PostgreSQL 16 + Redis 7 + Docker + nginx

El stack en sí mismo es una elección correcta. NestJS escala bien, Prisma con PostgreSQL es robusto, y el patrón de módulos es mantenible. La elección de JWT unificado para users+partners es elegante. Dicho esto:

**Lo que está bien:**

- Modularización NestJS correcta: cada dominio tiene su propio módulo, controlador, servicio y DTOs. Fácil de mantener.
- `ValidationPipe` con `whitelist: true` y `forbidNonWhitelisted: true` — protección contra mass assignment en toda la API.
- Estrategia JWT unificada (`jwt.strategy.ts`): un solo punto de validación para usuarios internos y partners externos, con comprobación de `payload.type`.
- Prisma como ORM: migraciones versionadas, type safety en queries, cascade deletes configurados correctamente.
- Red Docker interna: PostgreSQL y Redis no expuestos al exterior. Correcto.
- `@Public()` decorator para excluir endpoints del guard global — patrón limpio.

**Problemas estructurales:**

```
Problema 1: Lógica de negocio en controllers
─────────────────────────────────────────────
LeadsController.changeStatus() llama a CommissionsService directamente.
No existe capa de eventos/dominio. Si mañana necesitas añadir notificaciones
al cambio de estado, tienes que editar el controller.
Correcto: controller → leads.service → emit(LeadStatusChanged) → handlers

Problema 2: Sin event bus ni job queue
──────────────────────────────────────
Redis está configurado en docker-compose pero ThrottlerModule no usa
Redis store (usa memoria en proceso). Las colas de trabajo no existen.
Todo es request-response síncrono. Esto es frágil:
- Si la creación de comisión falla, el status ya cambió → inconsistencia
- Si el email falla (cuando se implemente), el cliente no sabe que falló
- No hay retry para ninguna operación asíncrona

Problema 3: Single-process, single-host
────────────────────────────────────────
No hay clustering de Node.js, no hay orquestación de contenedores.
Un único proceso NestJS maneja todo: solicitudes HTTP, tareas programadas
(ScheduleModule registrado pero sin jobs definidos), y operaciones IA.
Una solicitud IA de 30 segundos no bloquea el event loop, pero
múltiples en paralelo bajo carga sí degradarán el rendimiento.

Problema 4: Sin separación read/write
──────────────────────────────────────
Todo pasa por la misma instancia de Prisma conectada a la misma BD.
Para un SaaS con múltiples promociones activas, el dashboard de KPIs
(aggregate queries) compite con las operaciones del CRM en tiempo real.
```

**Lo que debe cambiar antes de producción:**

| Cambio | Severidad | Esfuerzo |
|--------|-----------|----------|
| Envolver `processLeadEvent` en `$transaction` | P0 crítico | 30 min |
| Redis ThrottlerStore para persistir rate limits | P1 | 1 hora |
| Backup PostgreSQL con cron automatizado | P0 crítico | 30 min |
| Redirect HTTP→HTTPS en nginx | P1 | 15 min |
| Validación de variables de entorno al startup | P1 | 1 hora |
| Bull queue para comisiones y notificaciones futuras | P2 | 1 día |

---

## 2. MÓDULOS EXISTENTES

### 2.1 AUTH (`modules/auth`)

**Qué resuelve**: Login para usuarios internos (staff), refresh token con rotación.

**Estado**: Bien implementado. JWT 15 min / refresh 7 días, rotación correcta (cada uso invalida el token anterior en BD).

**Lo que falta**:
- Rate limiting específico en `/auth/login`. El throttle global es 100 req/min, lo que permite ~6.000 intentos de contraseña por hora. Un atacante puede hacer fuerza bruta sin ser bloqueado hasta los 100 req/min.
- Bloqueo de cuenta tras N intentos fallidos.
- `POST /auth/forgot-password` y `POST /auth/reset-password` — inexistentes. Si un admin pierde acceso, no hay recovery.
- No hay 2FA (TOTP/SMS) para cuentas SUPER_ADMIN.

**Riesgo técnico principal**: Sin rate limit específico en login, las credenciales de demo (`Portalon2024!`) son atacables trivialmente.

---

### 2.2 PARTNERS (`modules/partners`)

**Qué resuelve**: Registro, login y gestión de la red de brokers/asesores externos.

**Estado**: ~75% funcional. El portal partner existe y es usable.

**Lo que falta**:
- `POST /partners/login` — los partners reciben un `accessToken` de 15 minutos pero **no reciben `refreshToken`**. Esto significa que se desloguean cada 15 minutos. En comparación, los usuarios internos tienen tokens de 7 días via refresh. Este es un bug UX severo para partners que trabajan todo el día con la plataforma.
- Endpoint para que el partner **recupere su contraseña** (forgot/reset).
- Aprobación automática para dominios corporativos conocidos.
- No hay endpoint para **actualizar el referralCode** (si un partner quiere personalizarlo).
- No hay tracking de **cuántos clicks** ha tenido su enlace (solo conversiones).

**Riesgo técnico**: La ausencia de refresh token para partners es una decisión que parece intencional (más seguro) pero que generará fricciones de UX en producción. Hay que decidir y documentar.

---

### 2.3 LEADS (`modules/leads`)

**Qué resuelve**: El núcleo del CRM. Pipeline NEW→WON con transiciones validadas, atribución y scoring IA.

**Estado**: ~85% funcional. Es el módulo más maduro.

**Lo que falta**:
- **Reasignación de lead**: No hay endpoint `PATCH /leads/:id/assign` para cambiar el comercial asignado.
- **Búsqueda por email/teléfono**: Si un comprador llama y el comercial busca por teléfono, no hay filtro por `phone` o `email` en `findAll`.
- **Deduplicación de leads**: Si el mismo email envía el formulario dos veces (con diferente referralCode), se crean dos leads. No hay lógica de merge ni aviso.
- **Lead con unidad reservada**: No hay validación de que si un lead pasa a RESERVED, la `unitId` asociada exista y esté AVAILABLE. Se puede reservar la misma unidad para dos leads simultáneamente.
- **Import masivo**: No hay `POST /leads/import` para subir CSV. Las promotoras suelen tener leads históricos.
- `score` y `aiSummary` en la respuesta de `GET /leads` no están incluidos en el listado principal — el comercial tiene que abrir cada lead para ver el score.

**Riesgo técnico principal**: La falta de validación de disponibilidad de unidad en estado RESERVED es un bug de negocio real. Dos comerciales pueden marcar el mismo apartamento como reservado para dos compradores distintos.

---

### 2.4 COMMISSIONS (`modules/commissions`)

**Qué resuelve**: Generación automática de eventos de comisión cuando un lead alcanza RESERVED o WON.

**Estado**: Funciona pero tiene un bug de integridad que puede causar pérdida de comisiones en producción.

**Bug crítico confirmado**:

```typescript
// commissions.service.ts — processLeadEvent()
// Patrón actual (NO atómico):
const existing = await this.prisma.commissionEvent.findFirst({...}); // CHECK
if (existing) return;  // ← Hay un gap aquí
await this.prisma.commissionEvent.create({...});  // CREATE

// Si dos requests llegan simultáneamente (ej. doble click en "cambiar estado"),
// ambos pasan el check de existing ANTES de que el primero complete el create.
// Resultado: dos CommissionEvents para el mismo (leadId, triggerType).
// El promotor paga la comisión dos veces.
```

**Solución**: `prisma.$transaction()` + `@@unique([leadId, triggerType])` en el schema.

**Lo que falta**:
- Endpoint para **recalcular** una comisión si la regla cambió.
- Endpoint para **disputar** una comisión (existe `DISPUTED` en el enum pero no hay endpoint).
- No hay validación de que la CommissionRule aplicada estaba activa en el momento en que se creó el evento (si se desactiva retroactivamente una regla, ¿qué pasa con eventos ya creados?).
- `ON_VISIT` y `ON_LEAD` existen como `CommissionTriggerType` en el schema pero nunca se disparan — dead code en el modelo de datos.
- No hay batch payment: el admin tiene que aprobar comisiones una a una. Sin agrupación por partner/mes.

---

### 2.5 ATTRIBUTION (`modules/attribution`)

**Qué resuelve**: Registra qué partner es responsable de traer cada lead para que las comisiones se atribuyan correctamente.

**Estado**: Implementado como first-touch single-point attribution. Funciona para el caso básico.

**Análisis de edge cases (ver sección 6 para detalle completo)**:
- Sin cookie/session tracking pre-conversión.
- Sin multi-touch attribution.
- Sin validación de que el referralCode en la URL se conserva si el comprador navega varias páginas.
- El `override` manual requiere acceso admin — no hay workflow de disputa automático.

---

### 2.6 AI (`modules/ai`)

**Qué resuelve**: Scoring automático de leads (0-100), resumen textual, detección de riesgo.

**Estado**: Bien diseñado para lo que hace. Graceful degradation correcto.

**Lo que hace REALMENTE**:
```
classifyLead()    → score: 0-100, heatLevel, buyerTypeEstimated, reasoning
summarizeLead()   → summary, nextAction, keyPoints[]
detectRiskFlags() → flags[], overallRisk, requiresManualReview
```

**Lo que NO hace (y se menciona como visión del producto)**:
- ❌ Generación de renders fotorrealistas de apartamentos
- ❌ Generación de vídeos de marketing
- ❌ Fichas técnicas automáticas
- ❌ Comparativas entre unidades
- ❌ Recomendaciones personalizadas al comprador
- ❌ Chatbot en landing page
- ❌ Descripción automática de unidades para portales

El módulo de IA actual es **exclusivamente un clasificador de leads de texto**. La visión de producto que menciona generación de contenido visual requiere servicios completamente distintos (Stable Diffusion, Runway, etc.) que no están integrados ni diseñados.

**Riesgo técnico**: Timeout de 30s, 3 requests en paralelo. En el peor caso, `triggerAiScore` tarda 90 segundos. Al ser fire-and-forget no bloquea la respuesta, pero con alta concurrencia puede agotar la conexión a Ollama.

---

### 2.7 PROMOTIONS (`modules/promotions`)

**Qué resuelve**: Gestión de las promociones inmobiliarias (el producto que se vende).

**Estado**: ~80% funcional.

**Lo que falta**:
- No hay workflow de publicación: un `DRAFT` puede pasar a `PUBLISHED` pero no hay validaciones (¿tiene unidades? ¿tiene imágenes? ¿tiene reglas de comisión?).
- No hay endpoint para **clonar** una promoción (útil cuando el promotor lanza una segunda fase).
- `heroImageUrl` y `brochureUrl` son strings libres — no hay upload de archivos real (el backend define `UPLOADS_DIR` en env pero no hay endpoint de upload visible).
- No hay slug autogenerado desde el nombre: el admin tiene que introducirlo manualmente, con riesgo de errores o colisiones.

---

### 2.8 UNITS (`modules/units`)

**Qué resuelve**: Las unidades individuales (apartamentos, villas) dentro de una promoción.

**Estado**: ~75% funcional.

**Lo que falta**:
- No hay validación de que cuando `lead.unitId = X` y `lead.status = RESERVED`, la unidad X tenga `status = RESERVED`. Estos dos sistemas de estado van por libre.
- No hay `GET /units/available?promotionId=X` para la landing pública.
- La sincronización de contadores (`syncPromotionUnitCounts()`) es un UPDATE manual — si falla, el contador queda desincronizado. Debería calcularse como subquery agregada, no como campo denormalizado.
- Sin upload de planos, renders o vídeos a nivel de unidad (solo a nivel de promoción).

---

### 2.9 DASHBOARD (`modules/dashboard`)

**Qué resuelve**: KPIs agregados para el admin.

**Estado**: Funcional para el caso básico.

**Lo que falta**:
- Datos históricos / tendencias (todo es snapshot actual, no hay evolución temporal).
- KPIs por comercial asignado.
- Sin cache: cada `GET /dashboard/admin` ejecuta 5-6 queries agregadas en paralelo. Con 100K leads, esto será lento.
- Sin filtro por rango de fechas.

---

### 2.10 AUDIT (`modules/audit`)

**Qué resuelve**: Registro inmutable de cambios críticos del sistema.

**Estado**: El servicio existe y está bien diseñado. El problema: **nunca se llama**.

```
AuditService.log() existe pero no está integrado en ningún módulo.
Cambios críticos que NO se registran en el audit log:
 - Cambio de estado de un lead
 - Aprobación/rechazo de un partner
 - Cambio de estado de una comisión
 - Cambio del modo de operación de una unidad
 - Cambio de reglas de comisión

El audit trail está completamente vacío en producción.
Esto es un problema legal y de auditoría para una plataforma que
mueve comisiones de miles de euros.
```

---

### 2.11 PREMIUM ASSETS (`modules/premium-assets`)

**Qué resuelve**: Extensión para gestión operacional de activos en múltiples modos (SALE/SHORT_STAY/MID_TERM/LONG_TERM).

**Estado**: Backend ~70% implementado. Sin UI admin para owners, operators, pricing.

**Lo que falta**:
- UI frontend para gestionar owners, operators, availability blocks y pricing profiles.
- El catálogo público (`GET /premium-assets/catalog`) existe pero no hay página frontend que lo muestre.
- No hay integración con sistemas de reservas externos (Airbnb, Booking) para SHORT_STAY.

---

### 2.12 HEALTH / INFRAESTRUCTURA

**Estado**: Correcto para MVP.

**Gaps**:
- Sin métricas (Prometheus/Grafana).
- Sin log aggregation (ELK, Loki).
- Sin alertas automáticas (si el backend cae, nadie se entera hasta que alguien lo nota).

---

## 3. MODELO DE NEGOCIO

La plataforma pretende cubrir 5 funciones de negocio. Veamos el estado real de cada una:

| Función | Estado | Veredicto |
|---------|--------|-----------|
| Generación de leads inmobiliarios | ✅ Landing pública + formulario + referral codes | Funciona |
| Afiliación de agentes/brokers | ✅ Registro, aprobación, portal, referral codes, estadísticas | Funciona con gaps (ver módulo 2.2) |
| Tracking de ventas en caliente | ⚠️ Pipeline CRM completo pero sin notificaciones en tiempo real | Funciona pero es sordo |
| Comisiones automáticas | ⚠️ Lógica correcta pero bug de race condition y sin audit trail | Funciona en condiciones normales |
| Visualización inteligente con IA | ❌ No existe. La IA solo clasifica leads, no genera ningún contenido visual | No existe |

**Análisis crítico del modelo**:

El modelo de afiliación (partner refiere → lead entra → venta → comisión) está correctamente arquitectado. Pero el modelo está incompleto en el ciclo de vida completo:

```
CICLO COMPLETO NECESARIO:
Lead entra ──► Comercial es notificado [FALTA]
              ──► Lead es contactado
              ──► Visita agendada [FALTA módulo visits]
              ──► Visita completada
              ──► Reserva con firma digital [FALTA]
              ──► Venta con documentos [FALTA]
              ──► Comisión calculada ✓
              ──► Comisión pagada
              ──► Partner es notificado [FALTA]

Sin notificaciones, sin agenda de visitas y sin firma digital,
la plataforma no puede acompañar una venta real de principio a fin.
El comercial tendrá que salir de la plataforma para hacer el 60%
de su trabajo (email, WhatsApp, calendario, DocuSign).
```

**Viabilidad del modelo**: La arquitectura SÍ permite el modelo, pero le faltan las conexiones operativas que hacen que el flujo sea fluido. El esqueleto está; los músculos no.

---

## 4. PORTAL DEL CLIENTE (comprador)

### Diagnóstico: El portal del comprador NO EXISTE

Este es el hallazgo más crítico del audit. Revisando exhaustivamente el repositorio:

```
frontend/app/(public)/     → Solo landing page + registro de partners
frontend/app/(private)/    → Solo portales admin y partner
```

**No existe ni una sola ruta, componente, ni endpoint para un comprador registrado.**

### Lo que falta para que el portal del comprador funcione

**Base de datos** (8 cambios en schema.prisma):

```prisma
model Buyer {
  id            String    @id @default(cuid())
  email         String    @unique
  firstName     String
  lastName      String?
  phone         String?
  country       String?
  passwordHash  String?
  emailVerified Boolean   @default(false)
  verifyToken   String?
  resetToken    String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  leads         Lead[]    // leads asociados a este comprador
  savedUnits    SavedUnit[]
  visits        Visit[]
}

model SavedUnit {
  id       String   @id @default(cuid())
  buyerId  String
  unitId   String
  createdAt DateTime @default(now())

  buyer Buyer @relation(...)
  unit  Unit  @relation(...)
  @@unique([buyerId, unitId])
}

model Visit {
  id          String      @id @default(cuid())
  leadId      String
  buyerId     String?
  scheduledAt DateTime
  location    String?
  notes       String?
  status      VisitStatus @default(PENDING)
  // ...
}
```

**Backend** (1 módulo completo nuevo):

```
modules/buyers/
├── buyers.controller.ts    // register, verify-email, login, me, saved-units
├── buyers.service.ts       // CRUD + email verification
├── dto/
│   ├── register-buyer.dto.ts
│   └── buyer-login.dto.ts
modules/visits/
├── visits.controller.ts    // schedule, confirm, cancel, list
├── visits.service.ts
```

**Frontend** (8+ rutas nuevas):

```
app/(buyer)/
├── registro/               // Formulario de registro del comprador
├── verificar-email/        // Pantalla de verificación de email
├── login/                  // Login exclusivo comprador
├── portal/
│   ├── page.tsx            // Dashboard: mis favoritos, próximas visitas
│   ├── unidades/           // Catálogo filtrable de unidades disponibles
│   │   └── [id]/           // Detalle de unidad: fotos, planos, precio, disponibilidad
│   ├── comparar/           // Comparativa lado a lado de 2-3 unidades
│   ├── visitas/            // Agendar y ver mis visitas
│   ├── documentos/         // Mis documentos (contrato, memoria de calidades)
│   └── chat/               // Chat con el agente asignado
```

**Servicios externos requeridos**:
- Servicio de email transaccional (Resend/Brevo) para verificación
- WebSocket o SSE para chat en tiempo real
- Almacenamiento de archivos (S3 o equivalente) para documentos
- Generación de PDF para comparativas

**Estimación de esfuerzo**: 4-6 semanas de desarrollo para un portal de comprador funcional básico.

---

## 5. PORTAL DE AGENTES

### Estado actual: ~70% implementado

Las funcionalidades existentes:

| Funcionalidad | Estado |
|---------------|--------|
| Login propio | ✅ `/partners/login` |
| Generar enlace de referido | ✅ Página de materiales con código |
| Ver estado del pipeline | ✅ `/partner/leads` con tabla filtrable |
| Ver sus comisiones | ✅ `/partner/commissions` |
| Crear lead manualmente | ✅ Formulario en portal |
| Materiales de marketing | ✅ `/partner/materiales` |

### Lo que falta

**1. Notificaciones en tiempo real** (bloqueante para el modelo de negocio):

```
El partner NO recibe ningún aviso cuando:
 - Un comprador ha usado su enlace (nuevo lead creado)
 - Su lead ha avanzado en el pipeline (QUALIFIED → CONTACTED)
 - Su lead ha llegado a VISIT_SCHEDULED
 - Su lead ha sido RESERVED (comisión generada)
 - Su comisión ha sido APPROVED o PAID

Sin notificaciones, el partner tiene que entrar al portal cada día
manualmente para ver si algo ha cambiado. Esto es inaceptable para
un sistema de afiliación comercial: el partner perderá interés
y dejará de usar la plataforma.
```

**2. Analytics de rendimiento del enlace**:
- Número de clicks en su referral link (no solo conversiones)
- Tasa de conversión click→lead por canal
- Comparativa con otros periods

**3. Multi-canal**: Un partner debería poder generar diferentes referral codes por canal (Instagram, LinkedIn, email) para saber cuál funciona mejor.

**4. Chat con el comercial**: El partner no puede comunicarse con el comercial asignado a su lead dentro de la plataforma.

**5. Onboarding guiado**: Un partner recién aprobado llega al portal sin ningún tutorial ni checklist de primeros pasos.

---

## 6. SISTEMA DE ATRIBUCIÓN

### Qué existe

Attribution de primer toque (first-touch), single-point. Cuando un lead llega con `referralCode` válido, se crea un registro `Attribution { leadId, partnerId, sourceChannel, utm* }`. Las comisiones usan este registro como fallback si `lead.partnerId` es null.

### Análisis de edge cases en producción

**Edge case 1: Doble submit del mismo formulario**

```
Comprador en mal WiFi → pulsa "Enviar" → timeout → pulsa de nuevo
Resultado: dos Lead records con el mismo email
No hay deduplicación por email ni por IP + timewindow
El promotor recibe el mismo lead dos veces, el mismo partner
podría recibir dos comisiones si ambos llegan a WON
```

**Edge case 2: Referral code inválido**

```
URL: /promocion/villa-azul?ref=CODIGOINVENTADO
Comportamiento actual: se ignora silenciosamente, lead se crea sin Attribution
Problema: el partner que comparte ese link no sabe que su código no funciona
No hay validación en el frontend ("código inválido")
```

**Edge case 3: Mismo comprador, diferente partner**

```
Comprador visita con enlace del partner A → no convierte
Una semana después, visita con enlace del partner B → convierte
Atribución actual: partner B (last-click ganador, porque es el único que trackea)
No hay cookie ni sesión que recuerde la primera visita
En un modelo de first-touch, partner A debería recibir la comisión
```

**Edge case 4: Múltiple envío con referralCode en la URL**

```
El referralCode está en la URL. Si el comprador navega /promocion/[slug]
y luego cierra el navegador y vuelve (sin el ?ref=), el código se pierde.
No hay persistencia en localStorage ni cookies del referralCode para
el visitante que aún no ha convertido.
```

**Edge case 5: Partner SUSPENDED después de atribuir**

```
Lead llega con referralCode de partner SUSPENDED (fue suspendido después)
Comportamiento actual: la Attribution se crea igualmente si findUnique lo encuentra
¿Debe un partner SUSPENDED recibir comisión por leads que llegaron cuando estaba activo?
No hay lógica que lo maneje.
```

**Edge case 6: Disputas de atribución**

```
`AttributionStatus.DISPUTED` existe en el schema pero:
 - No hay endpoint POST /attribution/:id/dispute
 - No hay UI para que el partner dispute una atribución
 - No hay workflow para resolver una disputa
El campo existe en BD pero es dead code funcional.
```

**¿Cómo se puede romper en producción?**

El riesgo más alto es la race condition de doble comisión (edge case 1 + bug de commissions.service), que puede costarle dinero real al promotor. Los edge cases 3-4 pueden generar conflictos entre partners sobre a quién le corresponde una comisión, que sin logs ni workflow de resolución se convertirán en disputas manuales.

---

## 7. ESCALABILIDAD

### Escenario: 100 promociones / 10.000 usuarios / 1.000 agentes / 100.000 leads

#### Base de datos

**Índices existentes** (bien cubiertos):

```
Lead: promotionId ✓, partnerId ✓, status ✓, score ✓, sourceType ✓,
      buyerType ✓, country ✓, assignedToUserId ✓
Partner: referralCode ✓, status ✓, email ✓
```

**Índices FALTANTES** (críticos para las queries más comunes):

```sql
-- Query más frecuente del CRM: leads por promotionId + status
CREATE INDEX MISSING ON leads(promotion_id, status);

-- Dashboard: comisiones pendientes por partner
CREATE INDEX MISSING ON commission_events(partner_id, status);

-- Pipeline del partner: sus leads por estado y fecha
CREATE INDEX MISSING ON leads(partner_id, status, created_at DESC);

-- Búsqueda por email de lead (deduplicación)
CREATE INDEX MISSING ON leads(email);

-- Attribution lookup por partnerI + fecha (para informes)
CREATE INDEX MISSING ON attributions(partner_id, created_at);
```

Con 100.000 leads y sin estos índices compuestos, un `SELECT` filtrado por `(promotionId + status)` hará un full table scan. A ~8KB por fila promedio, eso son 800MB de I/O por query.

**Problema de denormalización**:

```
promotion.totalUnits y promotion.unitsAvailable son campos
que se actualizan manualmente con syncPromotionUnitCounts().
Si falla esta sincronización (o hay un bug), los contadores
divergen de la realidad.

Con 100 promociones y operaciones concurrentes, este campo
desincronizará. Debería ser una subquery calculada, no un campo.
```

#### Aplicación (NestJS)

**Con 10.000 requests/hora**:
- Un solo proceso Node.js maneja cómodamente 10K req/hora.
- El cuello de botella será PostgreSQL connection pool (Prisma default: 10 conexiones).
- Las queries IA de 30 segundos pueden agotar el pool bajo carga.

**Con 100.000 leads en el CRM**:
- `GET /leads` con paginación: OK si tiene los índices correctos.
- `GET /dashboard/admin`: 5-6 aggregate queries en paralelo sin cache. A 100K leads, cada `COUNT(*) GROUP BY status` es lenta. Necesita cache con TTL de 5 minutos.

**Con 1.000 agentes activos simultáneamente**:
- El portal partner hace queries filtradas por `partnerId` → bien indexado ✓.
- El problema es la falta de WebSocket server para notificaciones en tiempo real. Con 1.000 conexiones simultáneas abiertas, un NestJS estándar las maneja, pero necesita ser considerado desde el diseño.

#### Lo que habría que cambiar para soportar esa escala

```
Prioridad 1 (necesario en cualquier escala):
 ├── Índices compuestos faltantes (30 min, Prisma migration)
 ├── $transaction en commissions (30 min)
 └── Cache en /dashboard/admin con Redis (2 horas)

Prioridad 2 (necesario a partir de ~10K leads/mes):
 ├── Bull queue para IA scoring y notificaciones
 ├── Connection pool tuning (DATABASE_URL?connection_limit=20)
 └── Lectura de datos del dashboard desde Redis cache

Prioridad 3 (necesario a escala real):
 ├── Separar proceso IA en microservicio independiente
 ├── PostgreSQL read replica para queries del dashboard
 ├── Horizontal scaling del backend (PM2 cluster o K8s)
 └── CDN para assets estáticos (imágenes de promoción)
```

---

## 8. CAPA DE IA

### Lo que existe actualmente

El módulo AI es un **cliente de Ollama (LLM local)** que hace tres operaciones sobre texto:

```
classifyLead(lead)    → Score 0-100, heat level, buyer type estimado
summarizeLead(lead)   → Resumen textual + próxima acción recomendada
detectRiskFlags(lead) → Lista de banderas de riesgo con severidad
```

Estas operaciones se invocan fire-and-forget después de crear/actualizar un lead. Si Ollama no está disponible, el sistema retorna defaults seguros. Esto es correcto para lo que hace.

### La brecha entre visión y realidad

La visión del producto incluye:

| Capacidad deseada | Estado | Servicios necesarios |
|------------------|--------|---------------------|
| Renders fotorrealistas de apartamentos | ❌ | Stable Diffusion / DALL-E 3 / Midjourney API |
| Vídeos de marketing automáticos | ❌ | Runway ML / Sora / Pika |
| Fichas técnicas generadas automáticamente | ❌ | LLM con template + datos de unidad |
| Comparativas automáticas entre unidades | ❌ | LLM + structured data (existe en BD) |
| Recomendaciones al comprador | ❌ | Sistema de recomendación + portal comprador (que tampoco existe) |

### Diseño del módulo de IA completo

Para que la visión sea alcanzable, la arquitectura de IA debería dividirse en cuatro capas:

**Capa 1 — Scoring y análisis (ya existe ~60%)**

```typescript
// Lo que hay: classifyLead, summarizeLead, detectRiskFlags
// Lo que falta: re-scoring automático cada 48h si el lead no avanza,
//               asistente para el comercial ("¿cómo abordo este lead?")
// Servicio: Ollama local (correcto, mantener)
```

**Capa 2 — Generación de contenido textual (no existe)**

```typescript
// Endpoints nuevos:
POST /ai/units/:id/description    // Genera descripción de marketing de la unidad
POST /ai/units/:id/tech-sheet     // Genera ficha técnica formal
POST /ai/units/compare            // Body: {unitIds: [A, B, C]} → comparativa
POST /ai/promotions/:id/summary   // Resumen ejecutivo de la promoción

// Servicio: Ollama con modelo más potente, o Claude API para calidad premium
// Contexto: datos de unit (bedrooms, m2, precio, amenities, location)
```

**Capa 3 — Generación de contenido visual (no existe)**

```typescript
// Endpoints nuevos:
POST /ai/units/:id/render          // Genera render a partir de descripción
GET  /ai/units/:id/renders         // Lista renders generados
POST /ai/promotions/:id/hero-image // Hero image para la landing

// Servicio: Stable Diffusion API (local via ComfyUI o remoto via Stability AI)
// IMPORTANTE: Esta capa requiere un worker separado con GPU.
// No puede correr en el mismo proceso NestJS.
// Arquitectura: NestJS → Bull queue → Worker con GPU → resultado en S3 → webhook callback
```

**Capa 4 — Recomendaciones personalizadas (no existe)**

```typescript
// Endpoint:
GET /ai/buyers/:id/recommendations  // Unidades recomendadas para este comprador

// Lógica:
// 1. Perfil del comprador: budget, bedrooms, tipo (inversor/usuario final)
// 2. Historial: qué unidades guardó, cuánto tiempo pasó en cada una
// 3. Matching: score de compatibilidad comprador ↔ unidad disponible
// Servicio: puede resolverse con LLM + prompt engineering inicialmente,
//           escalar a modelo de recomendación propio con suficientes datos
```

**Infraestructura necesaria para la visión completa**:

```yaml
# Servicios adicionales a añadir en docker-compose:
  ollama:          # Ya existe conceptualmente (externo)
    image: ollama/ollama:latest
    volumes:
      - ollama_models:/root/.ollama

  comfyui:         # Para renders (requiere GPU)
    image: pytorch/pytorch:latest
    # SOLO viable en servidor con GPU NVIDIA

  ai-worker:       # Worker separado para tareas pesadas
    build: ./ai-worker
    depends_on: [redis, comfyui]
    # Procesa colas de Bull: image-generation, video-generation
```

**Recomendación práctica**: La generación de renders/vídeos requiere GPU. En un servidor de producción normal esto no es viable. Para el MVP, la alternativa pragmática es:
1. Usar la API de Stability AI / DALL-E 3 para renders (coste ~$0.04/imagen).
2. Los vídeos de marketing se hacen manualmente por el equipo del promotor (no son automatizables de forma económica en MVP).
3. Fichas técnicas y comparativas SÍ son generables con el LLM actual.

---

## 9. EXPERIENCIA DE PRODUCTO

### Flujo del comprador (perspectiva del usuario final)

```
ESTADO ACTUAL:
Comprador recibe link de partner ──►
  Ve landing de la promoción ──►
  Rellena formulario (nombre, email, teléfono, presupuesto) ──►
  ... SILENCIO TOTAL ...
  Espera a que alguien le llame

PROBLEMAS:
1. No hay email de confirmación. El comprador no sabe si su solicitud llegó.
2. No hay portal donde el comprador pueda ver el estado de su solicitud.
3. No puede ver qué unidades hay disponibles con precios en tiempo real.
4. No puede comparar dos apartamentos sin llamar al comercial.
5. Si quiere agendar una visita, tiene que esperar a que le llamen.
6. Toda la documentación (planos, memoria de calidades) llega por email, fuera del sistema.
```

El flujo del comprador es una caja negra después del formulario. Desde la perspectiva de un inversor premium que investiga múltiples proyectos simultáneamente, esta experiencia es inferior a simplemente enviar un email.

### Flujo del comercial / Sales Agent

```
ESTADO ACTUAL:
Nuevo lead aparece en CRM ──►
  Comercial entra manualmente al CRM (nadie le avisa) ──►
  Ve el lead, abre el detalle ──►
  Lee el resumen de IA ──►
  Llama al comprador ──►
  Añade nota manualmente ──►
  Cambia status manualmente

PROBLEMAS:
1. El comercial no recibe ningún aviso de que hay un lead nuevo.
   Si está trabajando fuera del CRM (lo habitual), no lo ve.
2. Si quiere agendar una visita, tiene que salir a Google Calendar.
3. No puede ver si el lead ha visitado la web después del primer contacto
   (no hay tracking post-lead-creation).
4. No puede enviar documentos desde el CRM (tiene que ir a email).
5. El AI score está en el detalle del lead, pero en la lista solo ve nombre y estado.
   Para priorizar su trabajo tiene que entrar en cada lead.
```

### Flujo del partner / agente externo

```
ESTADO ACTUAL:
Partner comparte su enlace ──►
  Espera a que alguien entre al portal para ver si llegó algún lead ──►
  Ve sus leads en la tabla ──►
  Ve el estado del pipeline de cada uno ──►
  Ve sus comisiones cuando el admin las aprueba

PROBLEMAS:
1. No recibe notificación cuando llega un lead. Tiene que entrar al portal activamente.
2. No sabe cuántos clicks tuvo su enlace (solo conversiones).
3. No puede contactar al comercial desde el portal.
4. No puede generar diferentes links por canal (Instagram vs. email vs. WhatsApp).
5. La aprobación de la cuenta puede tardar días (no hay auto-aprobación ni SLA claro).
```

### Flujo del promotor / admin

```
ESTADO ACTUAL:
Configura la promoción ──►
  Añade unidades ──►
  Invita a partners ──►
  Aprueba partners manualmente ──►
  Gestiona el pipeline del CRM ──►
  Aprueba comisiones manualmente ──►
  Exporta... (no puede, no hay export)

PROBLEMAS:
1. No puede exportar leads a CSV para contabilidad o análisis externo.
2. No puede saber qué canal (qué partner, qué UTM) convierte mejor.
3. No tiene informe de ventas por periodo para los propietarios del activo.
4. Tiene que aprobar cada comisión individualmente — si hay 50 al mes, es manual e ineficiente.
5. No hay workflow de publicación para la promoción
   (un DRAFT puede accidentalmente publicarse incompleto).
```

---

## 10. MVP REAL

### Definición honesta del MVP para lanzar con una promoción real

**OBLIGATORIO** (sin esto no se puede operar):

```
✅ YA EXISTE:
 - Landing page de promoción con formulario de lead
 - Pipeline CRM (NEW → WON) con estados validados
 - Portal de partner (ver leads, comisiones, materiales)
 - Comisiones automáticas al llegar a RESERVED/WON
 - Attribution con referral codes
 - AI scoring de leads (degrada graciosamente si no disponible)
 - Admin dashboard con KPIs básicos
 - Auth con JWT + refresh token rotation

❌ FALTA Y ES BLOQUEANTE:
 - Notificación por email al comercial cuando llega lead nuevo
 - Email de confirmación al comprador ("recibimos tu solicitud")
 - Notificación al partner cuando su lead avanza de estado
 - Fix de race condition en commissions ($transaction)
 - Backup automático de PostgreSQL (cron)
 - Rate limit específico en /auth/login
 - HTTPS redirect en nginx
 - Recuperación de contraseña (forgot/reset) para users y partners
```

**PUEDE ESPERAR** (útil pero no bloquea la primera venta):

```
 - Portal del comprador
 - Módulo de visitas formal
 - Export CSV de leads
 - Audit log automático
 - Comparativa de unidades
 - Chat in-app
 - Multi-canal de referido para partners
 - Informe PDF de comisiones
 - Batch approval de comisiones
 - Generación de renders con IA
```

**INNECESARIO AHORA** (sobreingeniería para MVP):

```
 - Multi-tenant (múltiples promotoras en la misma instancia)
 - Sistema de pagos integrado (Stripe) — las comisiones se pagan por banco
 - Integración Airbnb/Booking para SHORT_STAY
 - Marketplace de compradores
 - Calendar sync (Google Cal, Outlook)
 - Full-text search (Elasticsearch)
 - Generación de vídeos con IA
 - Sistema de scoring de partners (tier/gamificación)
 - i18n / multi-idioma
 - API pública para integradores
 - SSO / SAML para equipos corporativos
```

**Estimación realista**: Con los 8 items bloqueantes corregidos, el proyecto está listo para producción con un primer cliente en **2-3 semanas** de trabajo.

---

## 11. RIESGOS

### Riesgos Técnicos

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|-------------|---------|-----------|
| **Race condition en comisiones**: doble comisión por doble-click | Media | Crítico (dinero) | `$transaction` + `@@unique([leadId, triggerType])` en schema. Esta semana. |
| **Sin backup automático**: pérdida de datos en fallo de disco | Media | Crítico (irrecuperable) | Cron job diario para `backup_postgres.sh`. Esta semana. |
| **Throttle en memoria**: rate limits se resetean en cada restart | Alta | Medio | Configurar `ThrottlerModule` con Redis store |
| **Sin HTTPS redirect**: URLs HTTP en emails llegan sin cifrar | Alta | Medio-alto | `return 301 https://$host$request_uri;` en nginx.conf |
| **N+1 en LeadsCRM**: con 100K leads y partner.name no incluido en select | Media | Medio | Añadir `include: { partner: { select: { name: true } } }` |
| **Timeout IA en cold start**: Ollama tarda 30s en cargar el modelo | Alta | Bajo | Pre-warming del modelo al inicio del backend |
| **Sin monitoring**: un fallo silencioso en producción puede durar horas | Alta | Alto | Uptime Robot (gratis) o Grafana Cloud para alertas básicas |

### Riesgos de Producto

| Riesgo | Impacto | Mitigación |
|--------|---------|-----------|
| **Churn del partner por falta de notificaciones**: el partner deja de usar la plataforma si no recibe avisos | Muy alto | Implementar email notifications antes del primer partner real |
| **Confusión sobre el portal del comprador**: el promotor puede venderle al cliente final la idea de que habrá "portal del comprador" sin que exista | Alto | Alinear expectativas antes de la demo; incluir portal como Fase 2 |
| **Adopción del CRM por el comercial**: si el comercial no abre el CRM cada mañana, los leads se enfrían | Alto | Notificaciones diarias de "leads pendientes de contactar" + integración con calendar |
| **Lock-in de una sola promoción**: la plataforma está hardcodeada a `NEXT_PUBLIC_PROMOTION_SLUG` — no soporta múltiples promotoras transparentemente | Medio | Arquitectura multi-promoción es necesaria desde el inicio del segundo cliente |
| **Partners con expectativas irreales sobre IA**: si se les muestra la demo con "scoring IA" esperan más de lo que hay | Medio | Comunicar claramente que el AI scoring es orientativo, no predictivo |

### Riesgos de Seguridad

| Riesgo | Severidad | Estado actual |
|--------|-----------|--------------|
| **Fuerza bruta en /auth/login**: 100 intentos/min × 60 min = 6.000 intentos/hora sin bloqueo | Alto | Sin mitigar |
| **Partner token no tiene refresh**: si el accessToken se copia en los 15 min de validez, acceso sin posibilidad de revocación | Medio | Sin mitigar |
| **Sin 2FA en SUPER_ADMIN**: la cuenta que controla todo el sistema no tiene segundo factor | Alto | Sin implementar |
| **CORS solo por FRONTEND_URL**: correcto, pero si `FRONTEND_URL` se configura como `*` en `.env`, deja de ser protección | Medio | Dependiente de config correcta |
| **SQL injection**: Prisma usa queries parametrizadas. Sin riesgo conocido | ✅ Mitigado | |
| **XSS**: React escapa por defecto, no hay `dangerouslySetInnerHTML`. Sin riesgo conocido | ✅ Mitigado | |
| **Datos sensibles en logs**: stack traces nunca van al cliente en producción (exception filter). Correcto | ✅ Mitigado | |
| **RGPD/LOPD**: los formularios de lead capturan datos personales (nombre, email, teléfono). No hay checkbox de consentimiento explícito ni política de privacidad enlazada en el formulario | Alto | Sin implementar |

---

## 12. RECOMENDACIONES

### P0 — Bloqueantes para cualquier deployment en producción

**1. Fix transaccionalidad de comisiones**

```typescript
// backend/src/modules/commissions/commissions.service.ts
// Envolver en $transaction y añadir constraint único en schema

// Schema: @@unique([leadId, triggerType]) en CommissionEvent
// Service: usar prisma.$transaction([...]) con upsert
```

**2. Backup automático de PostgreSQL**

```bash
# Añadir al servidor host:
# crontab -e
0 3 * * * cd /opt/portalon && \
  docker compose exec postgres pg_dump -U portalon portalon_db | \
  gzip > /backups/portalon_$(date +%Y%m%d).sql.gz && \
  find /backups -name "portalon_*.sql.gz" -mtime +30 -delete
```

**3. Rate limiting en endpoints de auth**

```typescript
// En auth.controller.ts y partners.controller.ts login:
@Throttle({ default: { limit: 5, ttl: 60000 } })  // 5 intentos/minuto
@Post('login')
```

**4. HTTPS redirect en nginx**

```nginx
# nginx/conf.d/default.conf — añadir server block HTTP:
server {
    listen 80;
    server_name _;
    return 301 https://$host$request_uri;
}
```

**5. Recuperación de contraseña**

```
POST /auth/forgot-password { email } → genera token + envía email
POST /auth/reset-password { token, newPassword } → actualiza hash
```

**6. Consentimiento RGPD en formularios**

```tsx
// En LeadForm.tsx — añadir antes del submit button:
<Checkbox required>
  Acepto la{' '}
  <a href="/politica-privacidad" target="_blank">política de privacidad</a>
  {' '}y el tratamiento de mis datos.
</Checkbox>
```

---

### P1 — Necesarios antes de tener el primer cliente real

**7. Sistema de notificaciones por email**

```
Servicio: Resend (free tier: 3.000 emails/mes)
Triggers mínimos:
  - Lead creado → email al comercial asignado
  - Lead creado → confirmación al comprador
  - Lead status changed → email al partner (solo si su lead)
  - Partner aprobado → email con credenciales + referral link
```

**8. Refresh token para partners**

Los partners actualmente solo reciben `accessToken` (15 min). Deben recibir el mismo flujo que los usuarios internos: `accessToken` (15 min) + `refreshToken` (7 días).

**9. Índices compuestos en base de datos**

```prisma
// schema.prisma — añadir en model Lead:
@@index([promotionId, status])
@@index([partnerId, status])
@@index([partnerId, createdAt])
@@index([email])          // para deduplicación

// en model CommissionEvent:
@@index([partnerId, status])
@@unique([leadId, triggerType])  // fix del race condition
```

**10. Redis como ThrottlerStore**

```typescript
// app.module.ts — ThrottlerModule debe usar Redis como store
// Actualmente usa memoria → los límites se resetean en cada restart
```

**11. Export de leads a CSV**

```
GET /admin/leads/export?status=...&promotionId=...&from=...&to=...
Content-Type: text/csv
```

---

### P2 — Recomendaciones para crecimiento post-MVP

**12. Módulo de visitas**

Modelo Visit en schema, endpoints CRUD, UI en lead detail para agendar y UI en dashboard para ver la agenda del día.

**13. Audit log automático**

Integrar `AuditService.log()` en los cambios críticos: cambio de status de lead, aprobación de partner, cambio de estado de comisión, modificación de reglas.

**14. Portal del comprador (Fase 2)**

Ver sección 4 para la especificación técnica completa. Estimación: 4-6 semanas.

**15. Separar la capa de IA en worker independiente**

```yaml
# docker-compose.yml — añadir:
  ai-worker:
    build: ./ai-worker
    environment:
      REDIS_URL: redis://redis:6379
      OPENCLAW_BASE_URL: http://host.docker.internal:11434
    command: node dist/worker.js
```

La IA de scoring no debe compartir proceso con las peticiones HTTP del CRM.

**16. Generación de contenido textual con IA**

Las fichas técnicas de unidades y comparativas son alcanzables con el LLM actual. Añadir:
- `POST /ai/units/:id/generate-description`
- `POST /ai/units/compare` con body `{unitIds: [...]}`

**17. Monitoring básico**

Uptime Robot (gratuito) para alertas si el backend cae. A mediano plazo: Grafana Cloud free tier con métricas de Node.js y PostgreSQL.

---

## CONCLUSIÓN

Portalon tiene una base técnica sólida y un modelo de negocio bien articulado. El CRM, la atribución y el sistema de comisiones están en el nivel correcto para un MVP. El error estratégico principal es que se ha construido un backend muy completo (incluyendo módulos como `premium-assets` que no son necesarios en el MVP) mientras quedan sin implementar las piezas que hacen funcionar el negocio en el día a día: notificaciones, visitas y recuperación de contraseña.

La brecha entre la visión del producto (portal del comprador, renders IA, vídeos de marketing) y la realidad del código es grande, pero no es una señal de alarma si el equipo entiende que esas características pertenecen a la Fase 2. Lo que sí es una señal de alarma es intentar vender esas características antes de tenerlas construidas.

**Para invertir en este proyecto con confianza se necesitaría ver**:
1. Los 8 items P0/P1 bloqueantes resueltos.
2. Un primer cliente real en producción (aunque sea en beta privada).
3. Claridad del equipo sobre qué es la Fase 1 y qué es la Fase 2.

Con esos tres puntos cubiertos, el proyecto tiene fundamentos para convertirse en una plataforma SaaS inmobiliaria diferenciada en el mercado español.
