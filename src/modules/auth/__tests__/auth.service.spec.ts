import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from '../auth.service';
import { HashService } from '../hash.service';
import { JWTService } from '../jwt.service';
import { WalletService } from '../../wallet/wallet.service';
import { WalletRepository } from '../../wallet/wallet.repository';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EventService } from '../../event/event.service';
import { ApiKeyService } from '../api-key.service';
import { ConfigService } from '@nestjs/config';
import * as sinon from 'sinon';
import { Wallet } from 'src/modules/wallet/entity/wallet.entity';
import { EventRepository } from '../../event/event.repository';
import { DataSource } from 'typeorm';
import { TrustRepository } from '../../trust/trust.repository';
import { TokenRepository } from '../../token/token.repository';

describe('AuthService', () => {
  let authService: AuthService;
  let walletService: WalletService;
  let hashService: HashService;
  let jwtService: JWTService;
  let eventService: EventService;
  let apiKeyService: ApiKeyService;

  beforeEach(async () => {
    const dataSourceMock = {
      createEntityManager: jest.fn().mockReturnValue({
        findOne: jest.fn(),
        save: jest.fn(),
        remove: jest.fn(),
        // Add any other methods that the repositories might use
      }),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        WalletService,
        HashService,
        JWTService,
        EventService,
        ApiKeyService,
        {
          provide: ConfigService, // Mock ConfigService
          useValue: {
            get: jest.fn().mockReturnValue('some-value'), // Mock implementation of get method
          },
        },
        {
          provide: getRepositoryToken(WalletRepository),
          useValue: {
            getById: jest.fn(),
            getByName: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(EventRepository),
          useValue: {
            // Mock EventRepository methods if necessary
          },
        },
        {
          provide: getRepositoryToken(TokenRepository),
          useValue: {
            // Mock TokenRepository methods if necessary
          },
        },
        {
          provide: getRepositoryToken(TrustRepository),
          useValue: {
            // Mock TrustRepository methods if necessary
          },
        },
        {
          provide: DataSource,
          useValue: dataSourceMock,
        },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    walletService = module.get<WalletService>(WalletService);
    hashService = module.get<HashService>(HashService);
    jwtService = module.get<JWTService>(JWTService);
    eventService = module.get<EventService>(EventService);
    apiKeyService = module.get<ApiKeyService>(ApiKeyService);
  });

  afterEach(() => {
    sinon.restore();
  });

  it('signin', async () => {
    const walletObject = {
      id: '1',
      name: 'wallet1',
      salt: 'salt',
      password: 'hash',
    } as Wallet;
    const getByNameStub = sinon
      .stub(walletService, 'getByName')
      .resolves(walletObject);
    const logEventStub = sinon.stub(eventService, 'logEvent');
    const sha512Stub = sinon.stub(hashService, 'sha512').returns('hash');
    const jwtSignStub = sinon.stub(jwtService, 'sign').resolves('token');
    const checkApiKeyStub = sinon.stub(apiKeyService, 'check').resolves();

    const wallet = 'wallet';
    const password = 'password';
    const apiKey = 'apiKey';
    const token = await authService.signIn(wallet, password, apiKey);

    expect(getByNameStub.calledOnceWithExactly(wallet)).toBe(true);
    expect(sha512Stub.calledOnceWithExactly(password, 'salt')).toBe(true);
    expect(
      jwtSignStub.calledOnceWithExactly(
        sinon.match({ id: '1', name: 'wallet1' }),
      ),
    ).toBe(true);
    expect(token).toBe('token');

    getByNameStub.restore();
    sha512Stub.restore();
    jwtSignStub.restore();
    logEventStub.restore();
    checkApiKeyStub.restore();
  });

  it('failed signin', async () => {
    const walletObject = { salt: 'salt', password: 'password' } as Wallet;
    const getByNameStub = sinon
      .stub(walletService, 'getByName')
      .resolves(walletObject);
    const logEventStub = sinon.stub(eventService, 'logEvent');
    const sha512Stub = sinon.stub(hashService, 'sha512').returns('hash');
    const jwtSignStub = sinon.stub(jwtService, 'sign').resolves('token');
    const checkApiKeyStub = sinon.stub(apiKeyService, 'check').resolves();

    const wallet = 'wallet';
    const password = 'password';
    const apiKey = 'apiKey';

    getByNameStub.resolves(walletObject); // Mock the getByName to return the wallet object

    try {
      await authService.signIn(wallet, password, apiKey);
    } catch (e) {
      expect(e.message).toBe('Invalid Credentials');
    }

    expect(getByNameStub.calledOnceWithExactly(wallet)).toBe(true);
    expect(sha512Stub.calledOnceWithExactly(password, 'salt')).toBe(true);
    expect(jwtSignStub.notCalled).toBe(true);

    getByNameStub.restore();
    sha512Stub.restore();
    jwtSignStub.restore();
    logEventStub.restore();
    checkApiKeyStub.restore();
  });
});
