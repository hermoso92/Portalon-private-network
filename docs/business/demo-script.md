# Guion de Demo Comercial — Portalon Private Network

**Duración**: 4 minutos | **Audiencia**: Promotora / Inversor en la plataforma

---

## Preparación (5 min antes)

```bash
# Verificar servicios activos
curl -s http://localhost:3001/api/v1/health

# Tener abiertas 2 ventanas del navegador:
# Ventana A: panel admin (modo normal)
# Ventana B: panel partner (modo incógnito)
```

---

## Minuto 1 — El panel del equipo comercial

**Ventana A → Login admin**
- Email: `admin@portalon.com` | Pass: `Portalon2024!`

**Decir**: *"Aquí ve el equipo de ventas todo el pipeline en tiempo real."*

1. **Dashboard** → señalar: "8 leads activos, 2 en reserva, 19.350€ en comisiones pendientes. Red de distribución activa."
2. **Leads** → CRM tabla con 8 leads, estados en color
3. Clic en **Michael Davidson** (WON, Reino Unido)
   - Score IA: **94 / 100** — fondo verde visible, etiqueta "Caliente"
   - Resumen IA: *"Inversor puro, perfil cash buyer. Ha comprado 2 activos similares en Lisboa y Marbella..."*
   - Timeline: NEW → QUALIFIED → VISITED → RESERVED → WON + llamadas y emails registrados
   - Comisiones: **"Comisión de reserva" 5.175€ pagada + "Comisión de venta" 10.350€ pendiente**

**Punto clave**: *"Cada movimiento del pipeline queda registrado, trazable, sin WhatsApp."*

---

## Minuto 2 — La gestión de riesgos en tiempo real

**Ventana A → Leads → David Chen** (CONTACTED, Hong Kong)

**Decir**: *"Y cuando hay una señal de riesgo, el sistema lo detecta automáticamente."*

1. Al abrir el lead → **alerta roja visible** en la parte superior: *"Requiere revisión manual"*
2. Panel de riesgo: **Riesgo alto** — dos flags:
   - 🔴 `offshore_funds` (HIGH): *"Fondos de origen no declarado. Requiere revisión AML antes de avanzar."*
   - 🟡 `reachability` (LOW): *"Respuesta lenta al contacto. Canal preferido: WhatsApp."*
3. Score 45/100, nivel "Templado"

**Punto clave**: *"El equipo sabe en qué leads avanzar y en cuáles no, con justificación trazable."*

---

## Minuto 3 — El portal del partner

**Ventana B → Login partner**
- Email: `partner@demo.com` | Pass: `Partner2024!`

**Decir**: *"Esto es lo que ve Carlos García, el broker de Madrid."*

1. **Dashboard partner** → "Sus leads, su comisión pendiente, su comisión total generada"
2. **Mis leads** → sólo los suyos (4 leads visibles, filtro automático)
3. **Su código de referral**: `CARL9X2F`
   - Caption: *"Comparte este enlace con tus clientes inversores"*
   - Mostrar URL: `portalon.com/promocion/el-portalon-del-brillante?ref=CARL9X2F`
4. **Comisiones** → 3.975€ pendiente (Sophie Laurent) + 15.525€ (Davidson cerrado)

**Punto clave**: *"El partner tiene visibilidad total sin acceder a datos de otros partners."*

---

## Minuto 4 — Captura de lead en tiempo real

**Ventana A (admin) + nueva pestaña**

1. Abrir: `http://localhost:3000/promocion/el-portalon-del-brillante?ref=CARL9X2F`
2. Rellenar formulario rápido:
   - Nombre: Demo Test | Email: demo@test.com | País: España | Interés: Alto
3. Enviar → **confirmar en ventana admin** que el lead aparece en la tabla (NEW)
4. Score IA: 30 inicial (fallback si OpenClaw no disponible)
5. Mover lead a **QUALIFIED** → pipeline avanza, actividad registrada

**Cerrar con**: *"Desde la captura hasta la comisión, todo automatizado y auditable."*

---

## Respuestas a preguntas frecuentes

**¿Dónde están los datos?** → En tu servidor. Sin cloud, sin terceros.

**¿Cuántos partners puede tener?** → Sin límite técnico. Cada uno con su código único.

**¿Qué pasa si la IA no está disponible?** → El sistema funciona igual, el scoring es 30 por defecto. Los datos del seed tienen scores reales precalculados.

**¿Se puede personalizar el porcentaje de comisión?** → Sí, por promoción y por tipo de evento (reserva / venta).

**¿Qué es ese alerta roja que aparece en David Chen?** → La IA detectó fondos de origen no declarado. El sistema bloquea el avance hasta validación manual. Esto es compliance integrado en el pipeline.

**¿Cuánto tarda en implantarse?** → Un VPS con Docker y el dominio configurado: menos de 2 horas.
