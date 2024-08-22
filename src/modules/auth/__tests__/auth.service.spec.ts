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
import { Wallet } from 'src/modules/wallet/entity/wallet.entity';
import { EventRepository } from '../../event/event.repository';
import { DataSource } from 'typeorm';
import { TrustRepository } from '../../trust/trust.repository';
import { TokenRepository } from '../../token/token.repository';
import { Event } from '../../event/entity/event.entity';
import { TokenService } from '../../token/token.service';

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
        TokenService,
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
    jest.clearAllMocks();
  });

  it('signin', async () => {
    const walletObject = {
      id: '1',
      name: 'wallet1',
      salt: 'salt',
      password: 'hash',
    } as Wallet;

    jest.spyOn(walletService, 'getByName').mockResolvedValue(walletObject);
    jest.spyOn(eventService, 'logEvent').mockResolvedValue(new Event());
    jest.spyOn(hashService, 'sha512').mockReturnValue('hash');
    jest.spyOn(jwtService, 'sign').mockReturnValue('token');
    jest.spyOn(apiKeyService, 'check').mockResolvedValue();

    const wallet = 'wallet';
    const password = 'password';
    const apiKey = 'apiKey';
    const token = await authService.signIn(wallet, password, apiKey);

    expect(walletService.getByName).toHaveBeenCalledWith(wallet);
    expect(hashService.sha512).toHaveBeenCalledWith(password, 'salt');
    expect(jwtService.sign).toHaveBeenCalledWith(
      expect.objectContaining({ id: '1', name: 'wallet1' }),
    );
    expect(token).toBe('token');
  });

  it('failed signin', async () => {
    const walletObject = { salt: 'salt', password: 'password' } as Wallet;

    jest.spyOn(walletService, 'getByName').mockResolvedValue(walletObject);
    jest.spyOn(eventService, 'logEvent').mockResolvedValue(new Event());
    jest.spyOn(hashService, 'sha512').mockReturnValue('hash');
    jest.spyOn(jwtService, 'sign').mockReturnValue('token');
    jest.spyOn(apiKeyService, 'check').mockResolvedValue();

    const wallet = 'wallet';
    const password = 'password';
    const apiKey = 'apiKey';

    try {
      await authService.signIn(wallet, password, apiKey);
    } catch (e) {
      expect(e.message).toBe('Invalid Credentials');
    }

    expect(walletService.getByName).toHaveBeenCalledWith(wallet);
    expect(hashService.sha512).toHaveBeenCalledWith(password, 'salt');
    expect(jwtService.sign).not.toHaveBeenCalled();
  });
});
