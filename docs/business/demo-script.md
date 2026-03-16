# Guion de Demo Comercial — Portalon Private Network

**Duración**: 3 minutos | **Audiencia**: Promotora / Inversor en la plataforma

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

1. **Dashboard** → señalar: "8 leads activos, 2 en reserva, 19.350€ en comisiones pendientes"
2. **Leads** → CRM tabla con 8 leads
3. Clic en **Michael Davidson** (WON, Reino Unido)
   - Score IA: **94 / 100** — resumen visible: *"Inversor británico, compra en efectivo..."*
   - Timeline completo: NEW → QUALIFIED → VISITED → RESERVED → WON
   - Comisiones: **5.175€ pagada + 10.350€ pendiente** = 15.525€

**Punto clave**: *"Cada movimiento del pipeline queda registrado, trazable, sin WhatsApp."*

---

## Minuto 2 — El portal del partner

**Ventana B → Login partner**
- Email: `partner@demo.com` | Pass: `Partner2024!`

**Decir**: *"Esto es lo que ve Carlos García, el broker de Madrid."*

1. **Dashboard partner** → "Sus leads, su comisión pendiente, su rendimiento"
2. **Mis leads** → sólo los suyos (4 leads visibles, filtro automático)
3. **Su código de referral**: `CARL9X2F`
   - Mostrar URL: `portalon.com/promocion/el-portalon-del-brillante?ref=CARL9X2F`
4. **Comisiones** → 3.975€ pendiente (Sophie Laurent) + 15.525€ (Davidson cerrado)

**Punto clave**: *"El partner tiene visibilidad total sin acceder a datos de otros partners."*

---

## Minuto 3 — Captura de lead en tiempo real

**Ventana A (admin) + nueva pestaña**

1. Abrir: `http://localhost:3000/promocion/el-portalon-del-brillante?ref=CARL9X2F`
2. Rellenar formulario rápido:
   - Nombre: Demo Test | Email: demo@test.com | País: España | Interés: Alto
3. Enviar → **confirmar en ventana admin** que el lead aparece en la tabla (NEW)
4. Score IA: 50 inicial (o el que calcule OpenClaw en vivo)
5. Mover lead a **QUALIFIED** → pipeline avanza, actividad registrada

**Cerrar con**: *"Desde la captura hasta la comisión, todo automatizado y auditable."*

---

## Respuestas a preguntas frecuentes

**¿Dónde están los datos?** → En tu servidor. Sin cloud, sin terceros.

**¿Cuántos partners puede tener?** → Sin límite técnico. Cada uno con su código único.

**¿Qué pasa si la IA no está disponible?** → El sistema funciona igual, el scoring es 50 por defecto.

**¿Se puede personalizar el porcentaje de comisión?** → Sí, por promoción y por tipo de evento (reserva / venta).

**¿Cuánto tarda en implantarse?** → Un VPS con Docker y el dominio configurado: menos de 2 horas.
