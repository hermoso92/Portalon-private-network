import { PrismaClient, UserRole, PartnerRoleType, PartnerStatus, LeadStatus, LeadSourceType, LeadActivityType, CommissionTriggerType, CommissionStatus, OperationMode, AssetStatus, OwnerType, AvailabilityBlockReason, PriceUnit } from '@prisma/client';
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

  const managerPasswordHash = await bcrypt.hash('Manager2024!', 12);
  await prisma.user.upsert({
    where: { email: 'manager@portalon.com' },
    update: {},
    create: {
      name: 'Sofía Navarro',
      email: 'manager@portalon.com',
      passwordHash: managerPasswordHash,
      role: UserRole.PROMOTION_MANAGER,
      isActive: true,
    },
  });
  console.log('Manager created: manager@portalon.com');

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
    update: {
      priceMin: 250000,
      priceMax: 300000,
      totalUnits: 8,
      unitsAvailable: 6,
    },
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
      priceMin: 250000,
      priceMax: 300000,
      totalUnits: 8,
      unitsAvailable: 6,
    },
  });
  console.log('Promotion created:', promotion.name);

  // -------------------------------------------------------
  // Units
  // -------------------------------------------------------
  const unitData = [
    // --- Villas (landing page showcase) ---
    { unitCode: 'V-01', title: 'Villa 1 — Jardín privado', bedrooms: 2, bathrooms: 2, interiorM2: 110, exteriorM2: 80, price: 250000, featured: false, sortOrder: 1, operationMode: OperationMode.SALE, assetStatus: AssetStatus.AVAILABLE },
    { unitCode: 'V-02', title: 'Villa 2 — Vistas al patio', bedrooms: 3, bathrooms: 2, interiorM2: 130, exteriorM2: 60, price: 265000, featured: false, sortOrder: 2, operationMode: OperationMode.SALE, assetStatus: AssetStatus.AVAILABLE },
    { unitCode: 'V-03', title: 'Villa 3 — Piscina privada', bedrooms: 3, bathrooms: 3, interiorM2: 145, exteriorM2: 120, price: 275000, featured: true, sortOrder: 3, operationMode: OperationMode.SALE, assetStatus: AssetStatus.AVAILABLE },
    { unitCode: 'V-04', title: 'Villa 4 — Suite principal', bedrooms: 4, bathrooms: 3, interiorM2: 180, exteriorM2: 150, price: 300000, featured: true, jacuzzi: true, parkingIncluded: true, sortOrder: 4, operationMode: OperationMode.SALE, assetStatus: AssetStatus.AVAILABLE },
    // --- Apartamentos (used by existing demo leads) ---
    { unitCode: 'A-01', title: 'Apartamento A-01 - Planta Baja', bedrooms: 1, bathrooms: 1, interiorM2: 45, price: 195000, featured: false, sortOrder: 5, operationMode: OperationMode.SHORT_STAY, assetStatus: AssetStatus.AVAILABLE },
    { unitCode: 'A-02', title: 'Apartamento A-02 - Primera', bedrooms: 2, bathrooms: 1, interiorM2: 62, price: 245000, sortOrder: 6, operationMode: OperationMode.SHORT_STAY, assetStatus: AssetStatus.AVAILABLE },
    { unitCode: 'A-03', title: 'Apartamento A-03 - Primera', bedrooms: 2, bathrooms: 2, interiorM2: 75, exteriorM2: 12, price: 285000, jacuzzi: true, sortOrder: 7, operationMode: OperationMode.MID_TERM, assetStatus: AssetStatus.AVAILABLE },
    { unitCode: 'B-01', title: 'Apartamento B-01 - Ático', bedrooms: 3, bathrooms: 2, interiorM2: 95, exteriorM2: 25, price: 385000, featured: false, jacuzzi: true, parkingIncluded: true, sortOrder: 8, operationMode: OperationMode.SALE, assetStatus: AssetStatus.AVAILABLE },
    { unitCode: 'B-02', title: 'Apartamento B-02 - Segunda', bedrooms: 1, bathrooms: 1, interiorM2: 40, price: 185000, sortOrder: 9, operationMode: OperationMode.SHORT_STAY, assetStatus: AssetStatus.OCCUPIED },
    { unitCode: 'B-03', title: 'Apartamento B-03 - Segunda', bedrooms: 2, bathrooms: 1, interiorM2: 58, price: 235000, sortOrder: 10, operationMode: OperationMode.LONG_TERM, assetStatus: AssetStatus.AVAILABLE },
    { unitCode: 'C-01', title: 'Apartamento C-01 - Tercera', bedrooms: 2, bathrooms: 2, interiorM2: 70, price: 265000, status: 'RESERVED' as const, sortOrder: 11, operationMode: OperationMode.SALE, assetStatus: AssetStatus.RESERVED },
    { unitCode: 'C-02', title: 'Apartamento C-02 - Tercera', bedrooms: 3, bathrooms: 2, interiorM2: 88, price: 345000, status: 'SOLD' as const, sortOrder: 12, operationMode: OperationMode.SALE, assetStatus: AssetStatus.OFF_MARKET },
  ];

  const units: Record<string, any> = {};
  for (const unit of unitData) {
    units[unit.unitCode] = await prisma.unit.upsert({
      where: { promotionId_unitCode: { promotionId: promotion.id, unitCode: unit.unitCode } },
      update: { title: unit.title, price: unit.price, operationMode: unit.operationMode, assetStatus: unit.assetStatus },
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

  // -------------------------------------------------------
  // Demo sales leads — buyer personas for sales meeting
  // -------------------------------------------------------
  const existingDemoLeads = await prisma.lead.count({
    where: { promotionId: promotion.id, email: 'alejandro.ruiz@gmail.com' },
  });

  if (existingDemoLeads === 0) {
    // 1. Madrid buyer — Spanish national, landing form
    const leadMadrid = await mkLead({
      firstName: 'Alejandro', lastName: 'Ruiz', email: 'alejandro.ruiz@gmail.com',
      phone: '+34 691 234 567', country: 'ES', status: LeadStatus.NEW,
      sourceType: LeadSourceType.LANDING_PUBLIC, unitCode: 'V-01',
      score: 52,
      aiSummary: 'Comprador madrileño. Busca segunda residencia en Córdoba o inversión para arrendamiento. Perfil solvente — propietario de vivienda habitual en Madrid. Alto interés, primer contacto pendiente.',
      budgetRange: '240000-270000', interestLevel: 'HIGH',
      buyerType: 'END_USER', language: 'es-ES',
    });
    await prisma.leadActivity.create({
      data: { leadId: leadMadrid.id, activityType: LeadActivityType.STATUS_CHANGE, payload: { status: LeadStatus.NEW, source: 'landing_public' } },
    });

    // 2. London buyer — foreign buyer, partner referral
    const leadLondon = await mkLead({
      firstName: 'Catherine', lastName: 'Williams', email: 'c.williams@outlook.co.uk',
      phone: '+44 7850 234 567', country: 'GB', status: LeadStatus.QUALIFIED,
      sourceType: LeadSourceType.PARTNER_REFERRAL, partnerId: partner1.id, unitCode: 'V-03',
      score: 71,
      aiSummary: 'Compradora británica de alto perfil. Busca segunda residencia en España, zona Patrimonio. Referida por Carlos García (broker). Confirmó presupuesto hasta 280k€. Segunda llamada programada.',
      assignedToUserId: agent.id, budgetRange: '260000-290000', interestLevel: 'HIGH',
      buyerType: 'END_USER', language: 'en-GB',
      aiRiskFlags: { flags: [], overallRisk: 'low', requiresManualReview: false },
    });
    await prisma.leadActivity.createMany({ data: [
      { leadId: leadLondon.id, userId: agent.id, activityType: LeadActivityType.STATUS_CHANGE, payload: { previousStatus: 'NEW', newStatus: 'QUALIFIED', note: 'Llamada inicial positiva. Confirma presupuesto y perfil.' } },
      { leadId: leadLondon.id, userId: agent.id, activityType: LeadActivityType.CALL_LOGGED, payload: { note: 'Segunda llamada 20 min. Muy interesada en Villa 3 — piscina privada. Solicita visita.' } },
    ]});

    // 3. Swiss investor — portfolio buyer, partner referral
    const leadInvestorDemo = await mkLead({
      firstName: 'Stefan', lastName: 'Meier', email: 's.meier@privatwealth.ch',
      phone: '+41 79 321 4567', country: 'CH', status: LeadStatus.VISIT_SCHEDULED,
      sourceType: LeadSourceType.PARTNER_REFERRAL, partnerId: partner2.id, unitCode: 'V-04',
      score: 88,
      aiSummary: 'Inversor suizo, family office de Zúrich. Busca activo patrimonial en España — horizonte largo plazo. Capacidad para adquirir 1-2 unidades. Visita confirmada. Alta prioridad.',
      assignedToUserId: agent.id, budgetRange: '280000-320000', interestLevel: 'HIGH',
      buyerType: 'INVESTOR', language: 'de-CH',
      aiRiskFlags: { flags: [], overallRisk: 'low', requiresManualReview: false },
    });
    await prisma.leadActivity.createMany({ data: [
      { leadId: leadInvestorDemo.id, userId: agent.id, activityType: LeadActivityType.STATUS_CHANGE, payload: { previousStatus: 'NEW', newStatus: 'CONTACTED', note: 'Contactado por Ana Torres (partner). Interés confirmado.' } },
      { leadId: leadInvestorDemo.id, userId: agent.id, activityType: LeadActivityType.STATUS_CHANGE, payload: { previousStatus: 'CONTACTED', newStatus: 'QUALIFIED', note: 'Perfil verificado. Capacidad financiera confirmada.' } },
      { leadId: leadInvestorDemo.id, userId: agent.id, activityType: LeadActivityType.STATUS_CHANGE, payload: { previousStatus: 'QUALIFIED', newStatus: 'VISIT_SCHEDULED', note: 'Visita programada para esta semana.' } },
    ]});

    console.log('Demo buyer leads created: Madrid (ES), London (GB), Zurich (CH)');
  }

  // -------------------------------------------------------
  // Premium Asset Operations — Owners
  // -------------------------------------------------------
  const owner1 = await prisma.owner.upsert({
    where: { email: 'javier.morales@gmail.com' },
    update: {},
    create: {
      name: 'Javier Morales Ruiz',
      email: 'javier.morales@gmail.com',
      phone: '+34 600 111 222',
      type: OwnerType.INDIVIDUAL,
      taxId: '12345678A',
      notes: 'Propietario particular — tiene 3 unidades en el edificio (A-01, A-02, B-02)',
    },
  });

  const owner2 = await prisma.owner.upsert({
    where: { email: 'inversiones@brillantepatrimonial.es' },
    update: {},
    create: {
      name: 'Brillante Patrimonial SL',
      email: 'inversiones@brillantepatrimonial.es',
      phone: '+34 957 123 456',
      type: OwnerType.COMPANY,
      taxId: 'B12345678',
      notes: 'Sociedad patrimonial — propietaria del ático B-01 y unidades B-03, C-01',
    },
  });

  const owner3 = await prisma.owner.upsert({
    where: { email: 'office@horizonfamilyoffice.com' },
    update: {},
    create: {
      name: 'Horizon Family Office SL',
      email: 'office@horizonfamilyoffice.com',
      phone: '+34 91 000 1234',
      type: OwnerType.COMPANY,
      taxId: 'B98765432',
      notes: 'Family office — adquirió A-03 y C-02 como inversión patrimonial',
    },
  });

  console.log('Owners created: 3');

  // Assign owners to units
  await prisma.unit.updateMany({
    where: { promotionId: promotion.id, unitCode: { in: ['A-01', 'A-02', 'B-02'] } },
    data: { ownerId: owner1.id },
  });
  await prisma.unit.updateMany({
    where: { promotionId: promotion.id, unitCode: { in: ['B-01', 'B-03', 'C-01'] } },
    data: { ownerId: owner2.id },
  });
  await prisma.unit.updateMany({
    where: { promotionId: promotion.id, unitCode: { in: ['A-03', 'C-02'] } },
    data: { ownerId: owner3.id },
  });

  // -------------------------------------------------------
  // Premium Asset Operations — Operator Assignments
  // -------------------------------------------------------
  const existingOperators = await prisma.operatorAssignment.count({
    where: { unitId: units['A-01'].id },
  });

  if (existingOperators === 0) {
    // Gestor turístico para SHORT_STAY units
    await prisma.operatorAssignment.createMany({
      data: [
        {
          unitId: units['A-01'].id,
          operatorName: 'Córdoba Experience SL',
          operatorEmail: 'ops@cordoba-experience.com',
          operatorPhone: '+34 957 200 300',
          startDate: new Date('2026-01-01'),
          commissionRate: 0.18,
          notes: 'Gestor turístico — gestiona A-01 y A-02, plataformas OTA y check-in',
          status: 'ACTIVE',
        },
        {
          unitId: units['A-02'].id,
          operatorName: 'Córdoba Experience SL',
          operatorEmail: 'ops@cordoba-experience.com',
          operatorPhone: '+34 957 200 300',
          startDate: new Date('2026-01-01'),
          commissionRate: 0.18,
          notes: 'Mismo gestor que A-01',
          status: 'ACTIVE',
        },
        {
          unitId: units['B-02'].id,
          operatorName: 'Córdoba Experience SL',
          operatorEmail: 'ops@cordoba-experience.com',
          operatorPhone: '+34 957 200 300',
          startDate: new Date('2026-01-01'),
          commissionRate: 0.18,
          notes: 'Actualmente ocupado — cliente en estancia',
          status: 'ACTIVE',
        },
        {
          unitId: units['B-01'].id,
          operatorName: 'Portalon Gestión Interna',
          operatorEmail: 'gestion@portalon.com',
          operatorPhone: '+34 957 100 200',
          startDate: new Date('2025-06-01'),
          commissionRate: 0.10,
          notes: 'Operador interno — gestión directa del ático premium en venta',
          status: 'ACTIVE',
        },
      ],
    });
    console.log('Operator assignments created: 4');
  }

  // -------------------------------------------------------
  // Premium Asset Operations — Pricing Profiles
  // -------------------------------------------------------
  const existingPricing = await prisma.pricingProfile.count({
    where: { unitId: units['A-01'].id },
  });

  if (existingPricing === 0) {
    await prisma.pricingProfile.createMany({
      data: [
        // SHORT_STAY: A-01 (studio)
        { unitId: units['A-01'].id, operationMode: OperationMode.SHORT_STAY, basePrice: 145, currency: 'EUR', priceUnit: PriceUnit.PER_NIGHT, minStay: 2, maxStay: 30, isActive: true, notes: 'Tarifa base temporada media. Mínimo 2 noches.' },
        // SHORT_STAY: A-02 (2BD)
        { unitId: units['A-02'].id, operationMode: OperationMode.SHORT_STAY, basePrice: 185, currency: 'EUR', priceUnit: PriceUnit.PER_NIGHT, minStay: 3, maxStay: 30, isActive: true, notes: 'Apartamento 2 dormitorios. Mínimo 3 noches.' },
        // SHORT_STAY: B-02 (studio compact)
        { unitId: units['B-02'].id, operationMode: OperationMode.SHORT_STAY, basePrice: 120, currency: 'EUR', priceUnit: PriceUnit.PER_NIGHT, minStay: 2, maxStay: 28, isActive: true, notes: 'Studio compacto. Alta rotación.' },
        // MID_TERM: A-03 (2BD jacuzzi)
        { unitId: units['A-03'].id, operationMode: OperationMode.MID_TERM, basePrice: 1850, currency: 'EUR', priceUnit: PriceUnit.PER_MONTH, minStay: 1, maxStay: 11, isActive: true, notes: 'Alquiler medio plazo. Incluye servicios básicos.' },
        // LONG_TERM: B-03 (2BD)
        { unitId: units['B-03'].id, operationMode: OperationMode.LONG_TERM, basePrice: 1200, currency: 'EUR', priceUnit: PriceUnit.PER_MONTH, minStay: 12, isActive: true, notes: 'Arrendamiento anual. Sin gastos de comunidad incluidos.' },
        // SALE: B-01 (ático)
        { unitId: units['B-01'].id, operationMode: OperationMode.SALE, basePrice: 385000, currency: 'EUR', priceUnit: PriceUnit.TOTAL, isActive: true, notes: 'Precio de venta ático. Negociable a partir de 370.000€.' },
        // SALE: C-01 (reservado)
        { unitId: units['C-01'].id, operationMode: OperationMode.SALE, basePrice: 265000, currency: 'EUR', priceUnit: PriceUnit.TOTAL, isActive: true, notes: 'Precio escritura acordado con Sophie Laurent.' },
      ],
    });
    console.log('Pricing profiles created: 7');
  }

  // -------------------------------------------------------
  // Premium Asset Operations — Availability Blocks
  // -------------------------------------------------------
  const existingBlocks = await prisma.availabilityBlock.count({
    where: { unitId: units['B-02'].id },
  });

  if (existingBlocks === 0) {
    await prisma.availabilityBlock.createMany({
      data: [
        // B-02 actualmente ocupado
        {
          unitId: units['B-02'].id,
          startDate: new Date('2026-03-10'),
          endDate: new Date('2026-03-24'),
          reason: AvailabilityBlockReason.OCCUPIED,
          notes: 'Estancia activa — familia alemana, checkout 24 marzo',
        },
        // A-01 mantenimiento próximo
        {
          unitId: units['A-01'].id,
          startDate: new Date('2026-03-28'),
          endDate: new Date('2026-04-02'),
          reason: AvailabilityBlockReason.MAINTENANCE,
          notes: 'Revisión HVAC + pintura anual',
        },
        // A-02 reserva confirmada
        {
          unitId: units['A-02'].id,
          startDate: new Date('2026-04-10'),
          endDate: new Date('2026-04-18'),
          reason: AvailabilityBlockReason.RESERVED,
          notes: 'Reserva Semana Santa — confirmada',
        },
        // C-01 bloqueado por proceso de escritura
        {
          unitId: units['C-01'].id,
          startDate: new Date('2026-03-16'),
          endDate: new Date('2026-04-30'),
          reason: AvailabilityBlockReason.BLOCKED,
          notes: 'Bloqueado durante proceso notarial — Sophie Laurent',
        },
      ],
    });
    console.log('Availability blocks created: 4');
  }

  // -------------------------------------------------------
  // Premium Leads — flujos de alquiler e inversión
  // -------------------------------------------------------
  const existingPremiumLeads = await prisma.lead.count({
    where: { promotionId: promotion.id, notes: { startsWith: '[Inquiry:' } },
  });

  if (existingPremiumLeads === 0) {
    // Lead 1: Comprador internacional via inquiry
    const leadBuyer = await prisma.lead.create({
      data: {
        promotionId: promotion.id,
        unitId: units['B-01'].id,
        partnerId: partner1.id,
        sourceType: LeadSourceType.PARTNER_REFERRAL,
        firstName: 'Valentina',
        lastName: 'Ferretti',
        email: 'v.ferretti@outlook.it',
        phone: '+39 347 123 4567',
        country: 'IT',
        status: LeadStatus.QUALIFIED,
        score: 78,
        buyerType: 'INVESTOR' as any,
        interestLevel: 'HIGH',
        budgetRange: '350000-420000',
        language: 'it-IT',
        notes: '[Inquiry: PURCHASE] Interested in the penthouse for family use and occasional rental yield.',
        aiSummary: 'Inversora italiana, 2ª residencia en España. Busca ático en el centro histórico. Perfil comprador cash, horizonte 5-10 años. Muy interesada en rentabilidad turística puntual.',
        attributionData: {
          inquiryType: 'PURCHASE',
          referralCode: 'CARL9X2F',
        },
      },
    });
    await prisma.attribution.create({
      data: { leadId: leadBuyer.id, partnerId: partner1.id, sourceChannel: 'landing_inquiry' },
    });
    await prisma.leadActivity.createMany({ data: [
      { leadId: leadBuyer.id, activityType: LeadActivityType.STATUS_CHANGE, payload: { previousStatus: 'NEW', newStatus: 'QUALIFIED', source: 'inquiry_form' } },
      { leadId: leadBuyer.id, userId: agent.id, activityType: LeadActivityType.CALL_LOGGED, payload: { note: 'Llamada inicial 20 min. Muy interesada en el ático. Confirma presupuesto hasta 400k€.' } },
    ]});

    // Lead 2: Cliente alquiler mid-term
    const leadRenter = await prisma.lead.create({
      data: {
        promotionId: promotion.id,
        unitId: units['A-03'].id,
        sourceType: LeadSourceType.LANDING_PUBLIC,
        firstName: 'Antoine',
        lastName: 'Blanchard',
        email: 'antoine.blanchard@protonmail.com',
        phone: '+33 6 55 44 33 22',
        country: 'FR',
        status: LeadStatus.CONTACTED,
        score: 62,
        buyerType: 'END_USER' as any,
        interestLevel: 'HIGH',
        budgetRange: '1500-2000/mes',
        language: 'fr-FR',
        notes: '[Inquiry: MID_TERM_RENTAL] Cherche appartement 2 chambres pour 4-6 mois, sabbatique à Cordoue.',
        aiSummary: 'Profesional francés en año sabático. Busca alquiler medio plazo 4-6 meses. Perfil solvente. Sin banderas de riesgo.',
        attributionData: {
          inquiryType: 'MID_TERM_RENTAL',
        },
      },
    });
    await prisma.leadActivity.createMany({ data: [
      { leadId: leadRenter.id, activityType: LeadActivityType.STATUS_CHANGE, payload: { previousStatus: 'NEW', newStatus: 'CONTACTED', source: 'landing_form' } },
      { leadId: leadRenter.id, userId: agent.id, activityType: LeadActivityType.EMAIL_SENT, payload: { note: 'Enviadas condiciones alquiler A-03: 1.850€/mes, mínimo 3 meses.' } },
    ]});

    // Lead 3: Inversor portfolio short-stay
    const leadInvestor = await prisma.lead.create({
      data: {
        promotionId: promotion.id,
        sourceType: LeadSourceType.PARTNER_REFERRAL,
        partnerId: partner2.id,
        firstName: 'Marcus',
        lastName: 'Hoffmann',
        email: 'm.hoffmann@wealth.de',
        phone: '+49 173 9876543',
        country: 'DE',
        status: LeadStatus.NEW,
        score: 85,
        buyerType: 'INVESTOR' as any,
        interestLevel: 'HIGH',
        budgetRange: '500000-700000',
        language: 'de-DE',
        notes: '[Inquiry: PURCHASE] Interesado en adquirir 2-3 unidades short-stay como portfolio de inversión.',
        aiSummary: 'Inversor alemán de alto perfil. Busca cartera de 2-3 apartamentos turísticos. Alta capacidad financiera. Horizonte de inversión 10 años. Alta prioridad.',
        attributionData: {
          inquiryType: 'PURCHASE',
          referralCode: 'ANAT8K3M',
        },
      },
    });
    await prisma.attribution.create({
      data: { leadId: leadInvestor.id, partnerId: partner2.id, sourceChannel: 'referral_link' },
    });

    console.log('Premium leads created: buyer (IT), renter (FR), investor portfolio (DE)');
  }

  // -------------------------------------------------------
  // Second promotion — Residencial Mediterráneo (Valencia)
  // Adds multi-promotion demo capability for the admin dashboard
  // -------------------------------------------------------
  const promotion2 = await prisma.promotion.upsert({
    where: { slug: 'residencial-mediterraneo-valencia' },
    update: { totalUnits: 6, unitsAvailable: 4 },
    create: {
      slug: 'residencial-mediterraneo-valencia',
      name: 'Residencial Mediterráneo',
      headline: 'Apartamentos de lujo con vistas al mar en el corazón del barrio del Carmen',
      shortDescription: 'Una exclusiva colección de 6 apartamentos premium en Valencia. Diseño contemporáneo, acabados de primera calidad y alta rentabilidad en uno de los mercados más dinámicos de España.',
      fullDescription: `Residencial Mediterráneo es una promoción de apartamentos premium en el barrio del Carmen de Valencia, a 5 minutos a pie de la playa y del puerto deportivo.

Cada unidad ofrece terrazas con vistas al Mediterráneo, acabados de primera calidad y domótica integrada. Ideal para inversores que buscan rentabilidad vacacional o residencia habitual en una de las ciudades con mayor crecimiento de España.`,
      location: 'Barrio del Carmen, Valencia',
      address: 'Calle del Carmen, 42',
      city: 'Valencia',
      country: 'ES',
      currency: 'EUR',
      publicStatus: 'PUBLISHED',
      priceMin: 185000,
      priceMax: 240000,
      totalUnits: 6,
      unitsAvailable: 4,
      heroImageUrl: null,
    },
  });
  console.log('Second promotion created:', promotion2.slug);

  // Commission rules for promotion2
  await prisma.commissionRule.upsert({
    where: { id: `cr-p2-reservation` },
    update: {},
    create: {
      id: `cr-p2-reservation`,
      promotionId: promotion2.id,
      triggerType: CommissionTriggerType.ON_RESERVATION,
      calculationType: 'PERCENTAGE_OF_SALE',
      amount: 1.5,
      isActive: true,
    },
  });
  await prisma.commissionRule.upsert({
    where: { id: `cr-p2-sale` },
    update: {},
    create: {
      id: `cr-p2-sale`,
      promotionId: promotion2.id,
      triggerType: CommissionTriggerType.ON_SALE,
      calculationType: 'PERCENTAGE_OF_SALE',
      amount: 3,
      isActive: true,
    },
  });

  // Units for promotion2
  const unitsP2 = [
    { unitCode: 'MED-01', title: 'Apartamento Ático — Terraza 40m²', bedrooms: 2, bathrooms: 2, interiorM2: 85, exteriorM2: 40, price: 240000, featured: true, status: 'AVAILABLE' as any },
    { unitCode: 'MED-02', title: 'Apartamento Planta 3 — Vistas al Mar', bedrooms: 2, bathrooms: 1, interiorM2: 72, exteriorM2: 12, price: 215000, featured: true, status: 'AVAILABLE' as any },
    { unitCode: 'MED-03', title: 'Apartamento Planta 2 — Orientación Sur', bedrooms: 1, bathrooms: 1, interiorM2: 58, exteriorM2: 8, price: 185000, featured: false, status: 'AVAILABLE' as any },
    { unitCode: 'MED-04', title: 'Apartamento Planta 2 — Interior', bedrooms: 1, bathrooms: 1, interiorM2: 55, exteriorM2: 0, price: 185000, featured: false, status: 'AVAILABLE' as any },
    { unitCode: 'MED-05', title: 'Apartamento Planta 1 — Jardín Comunitario', bedrooms: 2, bathrooms: 1, interiorM2: 68, exteriorM2: 20, price: 205000, featured: false, status: 'RESERVED' as any },
    { unitCode: 'MED-06', title: 'Local Comercial — Planta Baja', bedrooms: 0, bathrooms: 1, interiorM2: 95, exteriorM2: 0, price: 195000, featured: false, status: 'AVAILABLE' as any },
  ];

  const createdUnitsP2: Record<string, string> = {};
  for (const u of unitsP2) {
    const unit = await prisma.unit.upsert({
      where: { promotionId_unitCode: { promotionId: promotion2.id, unitCode: u.unitCode } },
      update: {},
      create: { ...u, promotionId: promotion2.id, operationMode: OperationMode.SALE, assetStatus: u.status === 'RESERVED' ? AssetStatus.RESERVED : AssetStatus.AVAILABLE },
    });
    createdUnitsP2[u.unitCode] = unit.id;
  }
  console.log('Units for Residencial Mediterráneo created');

  // Demo leads for promotion2
  const p2Lead1 = await prisma.lead.upsert({
    where: { id: 'p2-lead-elena-russo' },
    update: {},
    create: {
      id: 'p2-lead-elena-russo',
      promotionId: promotion2.id,
      unitId: createdUnitsP2['MED-02'],
      partnerId: partner1.id,
      sourceType: LeadSourceType.PARTNER_REFERRAL,
      firstName: 'Elena',
      lastName: 'Russo',
      email: 'e.russo@finanzaItalia.com',
      phone: '+39 02 9876543',
      country: 'IT',
      status: LeadStatus.QUALIFIED,
      score: 82,
      buyerType: 'INVESTOR' as any,
      budgetRange: '200000-250000',
      language: 'it-IT',
      notes: 'Inversora italiana. Busca apartamento para alquiler vacacional en Valencia. Horizonte 5 años.',
      aiSummary: 'Perfil inversor sólido. Mercado objetivo (Valencia) alineado con su estrategia. Presupuesto ajustado pero viable con MED-02.',
    },
  });
  await prisma.attribution.upsert({
    where: { leadId: p2Lead1.id },
    update: {},
    create: { leadId: p2Lead1.id, partnerId: partner1.id, sourceChannel: 'referral_link', utmSource: 'linkedin' },
  });

  const p2Lead2 = await prisma.lead.upsert({
    where: { id: 'p2-lead-james-whitfield' },
    update: {},
    create: {
      id: 'p2-lead-james-whitfield',
      promotionId: promotion2.id,
      unitId: createdUnitsP2['MED-01'],
      partnerId: partner2.id,
      sourceType: LeadSourceType.PARTNER_REFERRAL,
      firstName: 'James',
      lastName: 'Whitfield',
      email: 'j.whitfield@londonwealth.co.uk',
      phone: '+44 20 71234567',
      country: 'GB',
      status: LeadStatus.VISIT_SCHEDULED,
      score: 91,
      buyerType: 'INVESTOR' as any,
      budgetRange: '220000-260000',
      language: 'en-GB',
      notes: 'Gestor de patrimonios londinense. Conoce bien el mercado español. Muy interesado en el ático.',
      aiSummary: 'Lead de alta calidad. Perfil patrimonial alto. Visita confirmada para el ático MED-01. Propuesta de alquiler vacacional bien estructurada. Alta probabilidad de cierre.',
    },
  });
  await prisma.attribution.upsert({
    where: { leadId: p2Lead2.id },
    update: {},
    create: { leadId: p2Lead2.id, partnerId: partner2.id, sourceChannel: 'referral_link', utmSource: 'email_campaign' },
  });

  const p2Lead3 = await prisma.lead.upsert({
    where: { id: 'p2-lead-nadia-petrov' },
    update: {},
    create: {
      id: 'p2-lead-nadia-petrov',
      promotionId: promotion2.id,
      unitId: createdUnitsP2['MED-05'],
      partnerId: partner1.id,
      sourceType: LeadSourceType.PARTNER_REFERRAL,
      firstName: 'Nadia',
      lastName: 'Petrov',
      email: 'n.petrov@example.com',
      phone: '+7 495 1234567',
      country: 'RU',
      status: LeadStatus.RESERVED,
      score: 77,
      buyerType: 'END_USER' as any,
      budgetRange: '190000-210000',
      language: 'ru-RU',
      notes: 'Reside en Madrid. Busca segunda residencia en Valencia para uso personal. MED-05 reservado.',
      aiSummary: 'Compradora final. No perfil inversor. Motivación emocional fuerte (familia en Valencia). Financiación pre-aprobada. Reserva en curso.',
    },
  });
  await prisma.attribution.upsert({
    where: { leadId: p2Lead3.id },
    update: {},
    create: { leadId: p2Lead3.id, partnerId: partner1.id, sourceChannel: 'referral_link' },
  });
  // Commission event for p2Lead3 (RESERVED)
  await prisma.commissionEvent.upsert({
    where: { leadId_triggerType: { leadId: p2Lead3.id, triggerType: CommissionTriggerType.ON_RESERVATION } },
    update: {},
    create: {
      promotionId: promotion2.id,
      leadId: p2Lead3.id,
      partnerId: partner1.id,
      triggerType: CommissionTriggerType.ON_RESERVATION,
      baseAmount: 205000,
      commissionAmount: 3075,
      status: CommissionStatus.PENDING,
      notes: 'Auto-generado por cambio de estado a RESERVED',
    },
  });

  console.log('Second promotion leads and commissions created');

  printSummary();
}

function printSummary() {
  console.log('\n=== SEED COMPLETE ===');
  console.log('Admin:    admin@portalon.com        / Portalon2024!');
  console.log('Manager:  manager@portalon.com      / Manager2024!');
  console.log('Agente:   comercial@portalon.com    / Agent2024!');
  console.log('Partner1: partner@demo.com          / Partner2024!  | CARL9X2F');
  console.log('Partner2: ana.torres@demo.com       / Partner2024!  | ANAT8K3M');
  console.log('Partner3: pendiente@demo.com        / Partner2024!  | ROBE2W9P (PENDING)');
  console.log('\nVilla units (landing page):');
  console.log('  V-01 — Villa 1 · Jardín privado    250.000€');
  console.log('  V-02 — Villa 2 · Vistas al patio   265.000€');
  console.log('  V-03 — Villa 3 · Piscina privada   275.000€  ⭐ featured');
  console.log('  V-04 — Villa 4 · Suite principal   300.000€  ⭐ featured');
  console.log('\nDemo pipeline:');
  console.log('  WON        — michael.davidson (UK, comisiones 5.175€+10.350€)');
  console.log('  RESERVED   — sophie.laurent (FR, comisión 3.975€ pdte)');
  console.log('  VISIT_SCHED— stefan.meier (CH/investor, V-04 300k€) ← DEMO');
  console.log('  QUALIFIED  — catherine.williams (GB/London buyer, V-03 275k€) ← DEMO');
  console.log('  VISITED    — k.weber (DE)');
  console.log('  CONTACTED  — d.chen (HK)');
  console.log('  NEW        — alejandro.ruiz (Madrid/ES, V-01 250k€) ← DEMO');
  console.log('  NEW        — emma.j (UK), pedro.alves (PT)');
  console.log('  LOST       — t.muller (DE)');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
