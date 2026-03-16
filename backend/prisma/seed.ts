import { PrismaClient, UserRole, PartnerRoleType, PartnerStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Portalon Private Network...');

  // Super Admin
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

  // Sales Agent
  const agentPasswordHash = await bcrypt.hash('Agent2024!', 12);
  const agent = await prisma.user.upsert({
    where: { email: 'comercial@portalon.com' },
    update: {},
    create: {
      name: 'Agente Comercial',
      email: 'comercial@portalon.com',
      passwordHash: agentPasswordHash,
      role: UserRole.SALES_AGENT,
      isActive: true,
    },
  });
  console.log('Agent created:', agent.email);

  // Demo Promotion - El Portalón del Brillante
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

  // Units
  const unitData = [
    { unitCode: 'A-01', title: 'Apartamento A-01 - Planta Baja', bedrooms: 1, bathrooms: 1, interiorM2: 45, price: 195000, featured: true },
    { unitCode: 'A-02', title: 'Apartamento A-02 - Primera', bedrooms: 2, bathrooms: 1, interiorM2: 62, price: 245000 },
    { unitCode: 'A-03', title: 'Apartamento A-03 - Primera', bedrooms: 2, bathrooms: 2, interiorM2: 75, exteriorM2: 12, price: 285000, jacuzzi: true },
    { unitCode: 'B-01', title: 'Apartamento B-01 - Ático', bedrooms: 3, bathrooms: 2, interiorM2: 95, exteriorM2: 25, price: 385000, featured: true, jacuzzi: true, parkingIncluded: true },
    { unitCode: 'B-02', title: 'Apartamento B-02 - Segunda', bedrooms: 1, bathrooms: 1, interiorM2: 40, price: 185000 },
    { unitCode: 'B-03', title: 'Apartamento B-03 - Segunda', bedrooms: 2, bathrooms: 1, interiorM2: 58, price: 235000 },
    { unitCode: 'C-01', title: 'Apartamento C-01 - Tercera', bedrooms: 2, bathrooms: 2, interiorM2: 70, price: 265000, status: 'RESERVED' as const },
    { unitCode: 'C-02', title: 'Apartamento C-02 - Tercera', bedrooms: 3, bathrooms: 2, interiorM2: 88, price: 345000, status: 'SOLD' as const },
  ];

  for (const unit of unitData) {
    await prisma.unit.upsert({
      where: {
        promotionId_unitCode: {
          promotionId: promotion.id,
          unitCode: unit.unitCode,
        },
      },
      update: {},
      create: {
        ...unit,
        promotionId: promotion.id,
      },
    });
  }
  console.log('Units created');

  // Demo Partner
  const partnerPasswordHash = await bcrypt.hash('Partner2024!', 12);
  const partner = await prisma.partner.upsert({
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
      notes: 'Partner de demostración - broker inmobiliario con cartera de inversores en Madrid y Barcelona',
    },
  });
  console.log('Demo partner created:', partner.email, '| Referral code:', partner.referralCode);

  // Commission rules for promotion
  const existingRules = await prisma.commissionRule.count({
    where: { promotionId: promotion.id },
  });

  if (existingRules === 0) {
    await prisma.commissionRule.createMany({
      data: [
        {
          promotionId: promotion.id,
          triggerType: 'ON_RESERVATION',
          calculationType: 'PERCENTAGE_OF_SALE',
          amount: 1.5, // 1.5% on reservation
          isActive: true,
        },
        {
          promotionId: promotion.id,
          triggerType: 'ON_SALE',
          calculationType: 'PERCENTAGE_OF_SALE',
          amount: 3.0, // 3% on sale
          isActive: true,
        },
      ],
    });
    console.log('Commission rules created');
  }

  console.log('\n=== SEED COMPLETE ===');
  console.log('Admin login: admin@portalon.com / Portalon2024!');
  console.log('Agent login: comercial@portalon.com / Agent2024!');
  console.log('Partner login: partner@demo.com / Partner2024!');
  console.log('Promotion slug: el-portalon-del-brillante');
  console.log('Partner referral code: CARL9X2F');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
