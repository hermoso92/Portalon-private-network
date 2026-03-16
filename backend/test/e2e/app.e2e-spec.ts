import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';

/**
 * E2E tests for Portalon Private Network
 *
 * Requires a running PostgreSQL and Redis instance.
 * Set TEST_DATABASE_URL to point to a test database.
 *
 * Run with: npm run test:e2e
 */
describe('Portalon API (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let promotionId: string;
  let leadId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  // -------------------------------------------------------
  // Health check
  // -------------------------------------------------------
  describe('Health', () => {
    it('GET /api/v1/health should return ok', () => {
      return request(app.getHttpServer())
        .get('/api/v1/health')
        .expect(200)
        .expect((res) => {
          expect(res.body.status).toBe('ok');
        });
    });
  });

  // -------------------------------------------------------
  // Auth
  // -------------------------------------------------------
  describe('Auth', () => {
    it('POST /api/v1/auth/login with valid credentials should succeed', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'admin@portalon.com', password: 'Portalon2024!' })
        .expect(200);

      expect(res.body.accessToken).toBeDefined();
      expect(res.body.user.role).toBe('SUPER_ADMIN');
      adminToken = res.body.accessToken;
    });

    it('POST /api/v1/auth/login with wrong password should fail with 401', () => {
      return request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'admin@portalon.com', password: 'wrongpassword' })
        .expect(401);
    });

    it('GET /api/v1/auth/me should return authenticated user', () => {
      return request(app.getHttpServer())
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.email).toBe('admin@portalon.com');
        });
    });
  });

  // -------------------------------------------------------
  // Promotions
  // -------------------------------------------------------
  describe('Promotions', () => {
    it('GET /api/v1/promotions/public/:slug should return promotion', () => {
      return request(app.getHttpServer())
        .get('/api/v1/promotions/public/el-portalon-del-brillante')
        .expect(200)
        .expect((res) => {
          expect(res.body.slug).toBe('el-portalon-del-brillante');
          promotionId = res.body.id;
        });
    });

    it('GET /api/v1/promotions should require auth', () => {
      return request(app.getHttpServer())
        .get('/api/v1/promotions')
        .expect(401);
    });
  });

  // -------------------------------------------------------
  // Public Lead
  // -------------------------------------------------------
  describe('Public Lead', () => {
    it('POST /api/v1/leads/public should create a lead without auth', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/leads/public')
        .send({
          promotionId,
          firstName: 'María',
          lastName: 'Prueba',
          email: 'maria.prueba@test.com',
          phone: '+34 600 999 888',
          country: 'España',
          budgetRange: '200000-250000',
          notes: 'Test e2e lead',
        })
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.status).toBe('NEW');
      leadId = res.body.id;
    });

    it('POST /api/v1/leads/public with referralCode should attribute to partner', () => {
      return request(app.getHttpServer())
        .post('/api/v1/leads/public')
        .send({
          promotionId,
          firstName: 'Juan',
          email: 'juan@test.com',
          referralCode: 'CARL9X2F',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.sourceType).toBe('PARTNER_REFERRAL');
          expect(res.body.partnerId).toBeDefined();
        });
    });
  });

  // -------------------------------------------------------
  // Lead Pipeline
  // -------------------------------------------------------
  describe('Lead Pipeline', () => {
    it('PATCH /api/v1/leads/:id/status should change lead status', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/leads/${leadId}/status`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'QUALIFIED', note: 'Lead cualificado por e2e test' })
        .expect(200);

      expect(res.body.status).toBe('QUALIFIED');
    });

    it('GET /api/v1/leads/:id should include activities', () => {
      return request(app.getHttpServer())
        .get(`/api/v1/leads/${leadId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.activities).toBeDefined();
          expect(Array.isArray(res.body.activities)).toBe(true);
        });
    });
  });

  // -------------------------------------------------------
  // Partners
  // -------------------------------------------------------
  describe('Partners', () => {
    let partnerToken: string;

    it('POST /api/v1/partners/register should create a pending partner', () => {
      return request(app.getHttpServer())
        .post('/api/v1/partners/register')
        .send({
          name: 'Ana Martínez',
          email: `ana.e2e.${Date.now()}@test.com`,
          password: 'Partner2024!',
          roleType: 'BROKER',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.status).toBe('PENDING');
          expect(res.body.referralCode).toBeDefined();
        });
    });

    it('POST /api/v1/partners/login with approved partner should succeed', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/partners/login')
        .send({ email: 'partner@demo.com', password: 'Partner2024!' })
        .expect(200);

      expect(res.body.accessToken).toBeDefined();
      partnerToken = res.body.accessToken;
    });

    it('GET /api/v1/partners/me should return partner profile', () => {
      return request(app.getHttpServer())
        .get('/api/v1/partners/me')
        .set('Authorization', `Bearer ${partnerToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.email).toBe('partner@demo.com');
        });
    });
  });
});
