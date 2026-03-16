import { PrismaClient, UserRole, PartnerRoleType, PartnerStatus, LeadStatus, LeadSourceType, LeadActivityType, CommissionTriggerType, CommissionStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Portalon Private Network...');

  // -------------------------------------------------------
  // Users
  // -------------------------------------------------------
  const adminPasswordHash = await bcrypt.hash('Portalon2024!', 12);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@portalon.com' },
    update: {},
    create: {
      name: 'Administrador Portalon',
      email: 'admin@portalon.com',
      passwordHash: adminPasswordHash,
      role: UserRole.SUPER_ADMIN,
      isActive: true,
    },
  });
  console.log('Admin created:', admin.email);

  const agentPasswordHash = await bcrypt.hash('Agent2024!', 12);
  const agent = await prisma.user.upsert({
    where: { email: 'comercial@portalon.com' },
    update: {},
    create: {
      name: 'Laura Martínez',
      email: 'comercial@portalon.com',
      passwordHash: agentPasswordHash,
      role: UserRole.SALES_AGENT,
      isActive: true,
    },
  });
  console.log('Agent created:', agent.email);

  // -------------------------------------------------------
  // Promotion
  // -------------------------------------------------------
  const promotion = await prisma.promotion.upsert({
    where: { slug: 'el-portalon-del-brillante' },
    update: {},
    create: {
      slug: 'el-portalon-del-brillante',
      name: 'El Portalón del Brillante',
      headline: 'Apartamentos turísticos premium en el corazón de Córdoba',
      shortDescription:
        'Una exclusiva promoción de apartamentos turísticos de alto ticket en el centro histórico de Córdoba, diseñados para inversores que buscan rentabilidad y valor patrimonial.',
      fullDescription: `El Portalón del Brillante es una promoción única en su tipo.
Ubicada en pleno centro histórico de Córdoba, Patrimonio de la Humanidad,
esta promoción ofrece apartamentos turísticos premium con acabados de primera calidad,
diseño contemporáneo y una rentabilidad excepcional demostrada.

Cada unidad cuenta con una ubicación privilegiada, a pocos metros de la Mezquita-Catedral,
con todo el potencial turístico que ello implica. Ideal para inversores que buscan
un activo seguro, rentable y con alto valor patrimonial.`,
      location: 'Centro Histórico, Córdoba',
      address: 'Calle del Brillante, s/n',
      city: 'Córdoba',
      country: 'España',
      currency: 'EUR',
      publicStatus: 'PUBLISHED',
      priceMin: 195000,
      priceMax: 385000,
      totalUnits: 12,
      unitsAvailable: 8,
    },
  });
  console.log('Promotion created:', promotion.name);

  // -------------------------------------------------------
  // Units
  // -------------------------------------------------------
  const unitData = [
    { unitCode: 'A-01', title: 'Apartamento A-01 - Planta Baja', bedrooms: 1, bathrooms: 1, interiorM2: 45, price: 195000, featured: true, sortOrder: 1 },
    { unitCode: 'A-02', title: 'Apartamento A-02 - Primera', bedrooms: 2, bathrooms: 1, interiorM2: 62, price: 245000, sortOrder: 2 },
    { unitCode: 'A-03', title: 'Apartamento A-03 - Primera', bedrooms: 2, bathrooms: 2, interiorM2: 75, exteriorM2: 12, price: 285000, jacuzzi: true, sortOrder: 3 },
    { unitCode: 'B-01', title: 'Apartamento B-01 - Ático', bedrooms: 3, bathrooms: 2, interiorM2: 95, exteriorM2: 25, price: 385000, featured: true, jacuzzi: true, parkingIncluded: true, sortOrder: 4 },
    { unitCode: 'B-02', title: 'Apartamento B-02 - Segunda', bedrooms: 1, bathrooms: 1, interiorM2: 40, price: 185000, sortOrder: 5 },
    { unitCode: 'B-03', title: 'Apartamento B-03 - Segunda', bedrooms: 2, bathrooms: 1, interiorM2: 58, price: 235000, sortOrder: 6 },
    { unitCode: 'C-01', title: 'Apartamento C-01 - Tercera', bedrooms: 2, bathrooms: 2, interiorM2: 70, price: 265000, status: 'RESERVED' as const, sortOrder: 7 },
    { unitCode: 'C-02', title: 'Apartamento C-02 - Tercera', bedrooms: 3, bathrooms: 2, interiorM2: 88, price: 345000, status: 'SOLD' as const, sortOrder: 8 },
  ];

  const units: Record<string, any> = {};
  for (const unit of unitData) {
    units[unit.unitCode] = await prisma.unit.upsert({
      where: { promotionId_unitCode: { promotionId: promotion.id, unitCode: unit.unitCode } },
      update: {},
      create: { ...unit, promotionId: promotion.id },
    });
  }
  console.log('Units created:', Object.keys(units).length);

  // -------------------------------------------------------
  // Partners
  // -------------------------------------------------------
  const partnerPasswordHash = await bcrypt.hash('Partner2024!', 12);

  const partner1 = await prisma.partner.upsert({
    where: { email: 'partner@demo.com' },
    update: {},
    create: {
      name: 'Carlos García',
      company: 'Inversiones García SL',
      email: 'partner@demo.com',
      phone: '+34 666 123 456',
      roleType: PartnerRoleType.BROKER,
      status: PartnerStatus.APPROVED,
      referralCode: 'CARL9X2F',
      passwordHash: partnerPasswordHash,
      notes: 'Partner principal de demo — broker con cartera en Madrid y Barcelona',
      bankName: 'BBVA',
      bankAccountMasked: 'ES12 **** **** **** 4521',
    },
  });

  const partner2 = await prisma.partner.upsert({
    where: { email: 'ana.torres@demo.com' },
    update: {},
    create: {
      name: 'Ana Torres',
      company: 'Torres & Asociados',
      email: 'ana.torres@demo.com',
      phone: '+34 677 234 567',
      roleType: PartnerRoleType.ADVISOR,
      status: PartnerStatus.APPROVED,
      referralCode: 'ANAT8K3M',
      passwordHash: partnerPasswordHash,
      notes: 'Agente independiente — mercado internacional, clientes en UK y Alemania',
    },
  });

  await prisma.partner.upsert({
    where: { email: 'pendiente@demo.com' },
    update: {},
    create: {
      name: 'Roberto Sanz',
      company: 'Sanz Wealth Management',
      email: 'pendiente@demo.com',
      phone: '+34 611 345 678',
      roleType: PartnerRoleType.OTHER,
      status: PartnerStatus.PENDING,
      referralCode: 'ROBE2W9P',
      passwordHash: partnerPasswordHash,
      notes: 'En proceso de aprobación — family office con 3 clientes interesados',
    },
  });

  console.log('Partners created: CARL9X2F, ANAT8K3M, ROBE2W9P(PENDING)');

  // -------------------------------------------------------
  // Commission rules
  // -------------------------------------------------------
  const existingRules = await prisma.commissionRule.count({ where: { promotionId: promotion.id } });
  if (existingRules === 0) {
    await prisma.commissionRule.createMany({
      data: [
        { promotionId: promotion.id, triggerType: 'ON_RESERVATION', calculationType: 'PERCENTAGE_OF_SALE', amount: 1.5, isActive: true },
        { promotionId: promotion.id, triggerType: 'ON_SALE', calculationType: 'PERCENTAGE_OF_SALE', amount: 3.0, isActive: true },
      ],
    });
    console.log('Commission rules created: 1.5% reserva, 3% venta');
  }

  // -------------------------------------------------------
  // Demo leads — pipeline completo para demo de 3 minutos
  // -------------------------------------------------------
  const existingLeads = await prisma.lead.count({ where: { promotionId: promotion.id } });
  if (existingLeads > 0) {
    console.log('Leads already seeded, skipping lead creation');
    printSummary();
    return;
  }

  async function mkLead(data: {
    firstName: string; lastName: string; email: string; phone: string;
    country: string; status: LeadStatus; sourceType: LeadSourceType;
    partnerId?: string; unitCode?: string; score?: number; aiSummary?: string;
    assignedToUserId?: string; budgetRange?: string; interestLevel?: string;
    buyerType?: string; language?: string; aiRiskFlags?: object;
  }) {
    const unitId = data.unitCode ? units[data.unitCode]?.id : undefined;
    const lead = await prisma.lead.create({
      data: {
        promotionId: promotion.id, unitId,
        partnerId: data.partnerId, sourceType: data.sourceType,
        firstName: data.firstName, lastName: data.lastName,
        email: data.email, phone: data.phone, country: data.country,
        status: data.status, score: data.score, aiSummary: data.aiSummary,
        assignedToUserId: data.assignedToUserId,
        budgetRange: data.budgetRange, interestLevel: data.interestLevel,
        buyerType: data.buyerType as any,
        language: data.language,
        aiRiskFlags: data.aiRiskFlags as any,
      },
    });
    await prisma.leadActivity.create({
      data: { leadId: lead.id, activityType: LeadActivityType.STATUS_CHANGE, payload: { status: LeadStatus.NEW, source: data.sourceType } },
    });
    if (data.partnerId) {
      await prisma.attribution.create({
        data: {
          leadId: lead.id, partnerId: data.partnerId,
          sourceChannel: data.sourceType === LeadSourceType.PARTNER_REFERRAL ? 'referral_link' : 'partner_manual',
        },
      });
    }
    return lead;
  }

  // WON — operación cerrada, comisiones calculadas
  const leadWon = await mkLead({
    firstName: 'Michael', lastName: 'Davidson', email: 'michael.davidson@example.com',
    phone: '+44 7911 234567', country: 'GB', status: LeadStatus.WON,
    sourceType: LeadSourceType.PARTNER_REFERRAL, partnerId: partner1.id, unitCode: 'C-02',
    score: 94,
    aiSummary: 'Inversor puro, perfil cash buyer. Ha comprado 2 activos similares en Lisboa y Marbella. Alta capacidad ejecutiva, cierre en 3 semanas. Sin objeciones pendientes.',
    assignedToUserId: agent.id, budgetRange: '300000-400000', interestLevel: 'HIGH',
    buyerType: 'INVESTOR', language: 'en-GB',
    aiRiskFlags: { flags: [], overallRisk: 'low', requiresManualReview: false },
  });
  await prisma.leadActivity.createMany({ data: [
    { leadId: leadWon.id, userId: agent.id, activityType: LeadActivityType.STATUS_CHANGE, payload: { previousStatus: 'NEW', newStatus: 'QUALIFIED', note: 'Perfil verificado. Alto potencial.' } },
    { leadId: leadWon.id, userId: agent.id, activityType: LeadActivityType.CALL_LOGGED, payload: { note: 'Llamada inicial 15 min. Confirma interés en ático. Habla español básico.' } },
    { leadId: leadWon.id, userId: agent.id, activityType: LeadActivityType.STATUS_CHANGE, payload: { previousStatus: 'QUALIFIED', newStatus: 'VISITED', note: 'Visita presencial. Muy satisfecho.' } },
    { leadId: leadWon.id, userId: agent.id, activityType: LeadActivityType.EMAIL_SENT, payload: { note: 'Enviada memoria de calidades y proyección de rentabilidad turística.' } },
    { leadId: leadWon.id, userId: agent.id, activityType: LeadActivityType.STATUS_CHANGE, payload: { previousStatus: 'VISITED', newStatus: 'RESERVED', note: 'Contrato de reserva firmado. Señal 10.000€.' } },
    { leadId: leadWon.id, userId: agent.id, activityType: LeadActivityType.STATUS_CHANGE, payload: { previousStatus: 'RESERVED', newStatus: 'WON', note: 'Escritura firmada ante notario.' } },
  ]});
  await prisma.commissionEvent.createMany({ data: [
    { promotionId: promotion.id, leadId: leadWon.id, partnerId: partner1.id, triggerType: CommissionTriggerType.ON_RESERVATION, baseAmount: 345000, commissionAmount: 5175, status: CommissionStatus.PAID, notes: 'Comisión reserva — pagada' },
    { promotionId: promotion.id, leadId: leadWon.id, partnerId: partner1.id, triggerType: CommissionTriggerType.ON_SALE, baseAmount: 345000, commissionAmount: 10350, status: CommissionStatus.PENDING, notes: 'Comisión venta — pendiente liquidación' },
  ]});

  // RESERVED — reserva activa, comisión pendiente
  const leadReserved = await mkLead({
    firstName: 'Sophie', lastName: 'Laurent', email: 'sophie.laurent@example.com',
    phone: '+33 6 12 34 56 78', country: 'FR', status: LeadStatus.RESERVED,
    sourceType: LeadSourceType.PARTNER_REFERRAL, partnerId: partner1.id, unitCode: 'C-01',
    score: 87,
    aiSummary: 'Inversora con cartera en París y Burdeos. Busca diversificación geográfica en mercado español. Segunda visita muy positiva. Solicita condiciones de pago a 60 días para escritura.',
    assignedToUserId: agent.id, budgetRange: '250000-300000', interestLevel: 'HIGH',
    buyerType: 'INVESTOR', language: 'fr-FR',
    aiRiskFlags: { flags: [], overallRisk: 'low', requiresManualReview: false },
  });
  await prisma.leadActivity.createMany({ data: [
    { leadId: leadReserved.id, userId: agent.id, activityType: LeadActivityType.STATUS_CHANGE, payload: { previousStatus: 'NEW', newStatus: 'QUALIFIED' } },
    { leadId: leadReserved.id, userId: agent.id, activityType: LeadActivityType.STATUS_CHANGE, payload: { previousStatus: 'QUALIFIED', newStatus: 'VISIT_SCHEDULED', note: 'Visita programada.' } },
    { leadId: leadReserved.id, userId: agent.id, activityType: LeadActivityType.STATUS_CHANGE, payload: { previousStatus: 'VISIT_SCHEDULED', newStatus: 'VISITED', note: 'Visita completada. Muy interesada.' } },
    { leadId: leadReserved.id, userId: agent.id, activityType: LeadActivityType.CALL_LOGGED, payload: { note: 'Llamada post-visita. Negocia condiciones de pago aplazado para escritura.' } },
    { leadId: leadReserved.id, userId: agent.id, activityType: LeadActivityType.STATUS_CHANGE, payload: { previousStatus: 'VISITED', newStatus: 'RESERVED', note: 'Reserva firmada.' } },
  ]});
  await prisma.commissionEvent.create({ data: {
    promotionId: promotion.id, leadId: leadReserved.id, partnerId: partner1.id,
    triggerType: CommissionTriggerType.ON_RESERVATION, baseAmount: 265000, commissionAmount: 3975,
    status: CommissionStatus.PENDING, notes: 'Comisión reserva — pendiente',
  }});

  // VISITED — visita realizada, negociando (partner2)
  const leadVisited = await mkLead({
    firstName: 'Klaus', lastName: 'Weber', email: 'k.weber@example.de',
    phone: '+49 170 1234567', country: 'DE', status: LeadStatus.VISITED,
    sourceType: LeadSourceType.PARTNER_REFERRAL, partnerId: partner2.id, unitCode: 'B-01',
    score: 72,
    aiSummary: 'Empresario del sector tecnológico. Horizonte de inversión a 10 años, rentabilidad turística. Solicita proyección de ocupación y retorno anualizado. Pendiente de informe detallado.',
    assignedToUserId: agent.id, budgetRange: '350000-500000', interestLevel: 'MEDIUM',
    buyerType: 'INVESTOR', language: 'de-DE',
    aiRiskFlags: { flags: [{ type: 'financing', severity: 'medium', description: 'Solicita financiación 60%. Pendiente de confirmar aprobación bancaria.' }], overallRisk: 'medium', requiresManualReview: false },
  });
  await prisma.leadActivity.createMany({ data: [
    { leadId: leadVisited.id, userId: agent.id, activityType: LeadActivityType.STATUS_CHANGE, payload: { previousStatus: 'NEW', newStatus: 'QUALIFIED', note: 'Verificado con partner.' } },
    { leadId: leadVisited.id, userId: agent.id, activityType: LeadActivityType.STATUS_CHANGE, payload: { previousStatus: 'QUALIFIED', newStatus: 'VISIT_SCHEDULED' } },
    { leadId: leadVisited.id, userId: agent.id, activityType: LeadActivityType.STATUS_CHANGE, payload: { previousStatus: 'VISIT_SCHEDULED', newStatus: 'VISITED', note: 'Visita completada. Solicita rentabilidad.' } },
    { leadId: leadVisited.id, userId: agent.id, activityType: LeadActivityType.EMAIL_SENT, payload: { note: 'Enviado informe de proyección de rentabilidad turística. Pendiente respuesta.' } },
  ]});

  // VISIT_SCHEDULED (partner2)
  const leadScheduled = await mkLead({
    firstName: 'Isabelle', lastName: 'Moreau', email: 'i.moreau@example.fr',
    phone: '+33 7 98 76 54 32', country: 'FR', status: LeadStatus.VISIT_SCHEDULED,
    sourceType: LeadSourceType.PARTNER_MANUAL, partnerId: partner2.id, unitCode: 'A-03',
    score: 61, aiSummary: 'Compradora francesa. Uso vacacional + inversión. Visita confirmada la próxima semana.',
    budgetRange: '250000-300000', interestLevel: 'MEDIUM',
    buyerType: 'END_USER', language: 'fr-FR',
    aiRiskFlags: { flags: [], overallRisk: 'low', requiresManualReview: false },
  });
  await prisma.leadActivity.createMany({ data: [
    { leadId: leadScheduled.id, activityType: LeadActivityType.STATUS_CHANGE, payload: { previousStatus: 'NEW', newStatus: 'CONTACTED' } },
    { leadId: leadScheduled.id, activityType: LeadActivityType.STATUS_CHANGE, payload: { previousStatus: 'CONTACTED', newStatus: 'VISIT_SCHEDULED', note: 'Visita confirmada.' } },
  ]});

  // CONTACTED — lead directo web, señales de riesgo AML
  const leadContacted = await mkLead({
    firstName: 'David', lastName: 'Chen', email: 'd.chen@example.hk',
    phone: '+852 9123 4567', country: 'HK', status: LeadStatus.CONTACTED,
    sourceType: LeadSourceType.LANDING_PUBLIC,
    score: 45, aiSummary: 'Lead de alta ticket pero con señales de riesgo. Fondos de origen no declarado. No avanzar sin validación AML. Interés genuino pero proceso bloqueado por compliance.',
    assignedToUserId: agent.id, budgetRange: '200000-300000', interestLevel: 'LOW',
    buyerType: 'INVESTOR', language: 'zh-HK',
    aiRiskFlags: {
      flags: [
        { type: 'offshore_funds', severity: 'high', description: 'Fondos de origen no declarado. Requiere revisión AML antes de avanzar.' },
        { type: 'reachability', severity: 'low', description: 'Respuesta lenta al contacto. Canal preferido: WhatsApp.' },
      ],
      overallRisk: 'high',
      requiresManualReview: true,
    },
  });
  await prisma.leadActivity.createMany({ data: [
    { leadId: leadContacted.id, userId: agent.id, activityType: LeadActivityType.STATUS_CHANGE, payload: { previousStatus: 'NEW', newStatus: 'CONTACTED', note: 'Primer contacto por email.' } },
    { leadId: leadContacted.id, userId: agent.id, activityType: LeadActivityType.CALL_LOGGED, payload: { note: 'Intento de llamada. No contesta. Enviado WhatsApp. Responde tarde con poco detalle.' } },
  ]});

  // NEW leads
  await mkLead({
    firstName: 'Emma', lastName: 'Johnson', email: 'emma.j@example.co.uk',
    phone: '+44 7700 900123', country: 'GB', status: LeadStatus.NEW,
    sourceType: LeadSourceType.LANDING_PUBLIC,
    score: 38, aiSummary: 'Lead reciente llegada desde Google Ads (campaign: cordoba-inversores-2024). Interés en studio de entrada. Presupuesto ajustado. Pendiente calificación inicial.',
    budgetRange: '180000-220000', interestLevel: 'MEDIUM',
    buyerType: 'END_USER', language: 'en-GB',
  });

  await mkLead({
    firstName: 'Pedro', lastName: 'Alves', email: 'pedro.alves@example.pt',
    phone: '+351 912 345 678', country: 'PT', status: LeadStatus.NEW,
    sourceType: LeadSourceType.PARTNER_REFERRAL, partnerId: partner1.id, unitCode: 'A-02',
    score: 55, aiSummary: 'Referido directo de Carlos García. Primer contacto pendiente. Perfil inversor conocido, ya opera en mercado de Lisboa. Alto potencial.',
    budgetRange: '220000-260000', interestLevel: 'HIGH',
    buyerType: 'INVESTOR', language: 'pt-PT',
  });

  // LOST — para completar el pipeline visible
  const leadLost = await mkLead({
    firstName: 'Thomas', lastName: 'Müller', email: 't.muller@example.de',
    phone: '+49 160 9876543', country: 'DE', status: LeadStatus.LOST,
    sourceType: LeadSourceType.PARTNER_REFERRAL, partnerId: partner2.id,
    score: 22, aiSummary: 'Lead perdido. Presupuesto muy por debajo del mínimo de la promoción. Sin encaje de producto.',
    budgetRange: '150000-180000', interestLevel: 'LOW',
    buyerType: 'INVESTOR', language: 'de-DE',
    aiRiskFlags: { flags: [{ type: 'budget', severity: 'high', description: 'Presupuesto muy por debajo del mínimo de la promoción.' }], overallRisk: 'high', requiresManualReview: false },
  });
  await prisma.leadActivity.createMany({ data: [
    { leadId: leadLost.id, activityType: LeadActivityType.STATUS_CHANGE, payload: { previousStatus: 'NEW', newStatus: 'QUALIFIED' } },
    { leadId: leadLost.id, activityType: LeadActivityType.STATUS_CHANGE, payload: { previousStatus: 'QUALIFIED', newStatus: 'LOST', note: 'Presupuesto muy por debajo del rango.' } },
  ]});

  console.log('Leads created: WON, RESERVED, VISITED, VISIT_SCHEDULED, CONTACTED, NEW(x2), LOST');
  printSummary();
}

function printSummary() {
  console.log('\n=== SEED COMPLETE ===');
  console.log('Admin:    admin@portalon.com        / Portalon2024!');
  console.log('Agente:   comercial@portalon.com    / Agent2024!');
  console.log('Partner1: partner@demo.com          / Partner2024!  | CARL9X2F');
  console.log('Partner2: ana.torres@demo.com       / Partner2024!  | ANAT8K3M');
  console.log('Partner3: pendiente@demo.com        / Partner2024!  | ROBE2W9P (PENDING)');
  console.log('\nDemo pipeline:');
  console.log('  WON      — michael.davidson (UK, C-02 345k€, comisiones 5.175€+10.350€)');
  console.log('  RESERVED — sophie.laurent (FR, C-01 265k€, comisión 3.975€ pdte)');
  console.log('  VISITED  — k.weber (DE, B-01 ático 385k€)');
  console.log('  SCHED.   — i.moreau (FR, A-03)');
  console.log('  CONTACT. — d.chen (HK, landing)');
  console.log('  NEW      — emma.j (UK), pedro.alves (PT)');
  console.log('  LOST     — t.muller (DE)');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
