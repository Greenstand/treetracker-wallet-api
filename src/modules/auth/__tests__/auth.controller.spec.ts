import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../../app/app.module';
import { SeedService } from '../../seed/seed.service';
import { ConfigModule } from '@nestjs/config';
import { WalletRepository } from '../../wallet/wallet.repository';
import { HashService } from '../hash.service';

describe('Authentication', () => {
  let app: INestApplication;
  let seedService: SeedService;

  const mockWalletRepository = {
    getByName: jest.fn().mockResolvedValue({
      id: '550e8400-e29b-41d4-a716-446655440000',
      name: 'walletA',
      password: 'hashedPassword',
      salt: 'randomSalt',
    }),
  };

  const mockHashService = {
    sha512: jest.fn().mockReturnValue('hashedPassword'),
  };

  beforeAll(async () => {
    // mock environment variables
    process.env.S3_BUCKET = 'mock-bucket';
    process.env.S3_REGION = 'mock-region';

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        AppModule,
        ConfigModule.forRoot({
          envFilePath: `.env.${process.env.NODE_ENV}`,
        }),
      ],
    })
      .overrideProvider(WalletRepository)
      .useValue(mockWalletRepository)
      .overrideProvider(HashService)
      .useValue(mockHashService)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    seedService = moduleFixture.get<SeedService>(SeedService);

    // clear and seed the database before running the tests
    await seedService.clear();
    await seedService.seed();
  }, 30000);

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
    expect(mockWalletRepository.getByName).toHaveBeenCalledWith('walletA');
    expect(mockHashService.sha512).toHaveBeenCalledWith(
      'test1234',
      'randomSalt',
    );
  });
});
