import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../../app/app.module';
import { SeedService } from '../../seed/seed.service';
import { ConfigModule } from '@nestjs/config';

describe('Authentication', () => {
  let app: INestApplication;
  let seedService: SeedService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        AppModule,
        ConfigModule.forRoot({
          envFilePath: `.env.${process.env.NODE_ENV}`,
        }),
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    seedService = moduleFixture.get<SeedService>(SeedService);

    // clear and seed the database before running the tests
    await seedService.clear();
    await seedService.seed();
  });

  afterAll(async () => {
    await app.close();
  });

  it('should login with valid credentials', async () => {
    const staticApiKey = 'FORTESTFORTESTFORTESTFORTESTFORTEST';

    const response = await request(app.getHttpServer())
      .post('/auth')
      .set('treetracker-api-key', staticApiKey)
      .send({ wallet: 'walletA', password: 'test1234' })
      .expect('Content-Type', /json/)
      .expect(200);

    expect(response.body).toHaveProperty('token');
  });
});
