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
import { Wallet } from '../../wallet/entity/wallet.entity';
import { EventRepository } from '../../event/event.repository';
import { DataSource } from 'typeorm';
import { Event } from '../../event/entity/event.entity';
import { TrustService } from '../../trust/trust.service';
import { TokenService } from '../../token/token.service';
import { TrustRepository } from '../../trust/trust.repository';
import { TokenRepository } from '../../token/token.repository';
import { S3Service } from '../../../common/services/s3.service';
import { TransferService } from '../../transfer/transfer.service';
import { TransferRepository } from '../../transfer/transfer.repository';
import { TransactionRepository } from '../../transaction/transaction.repository';

describe('AuthService', () => {
  let authService: AuthService;
  let walletService: WalletService;
  let eventService: EventService;
  let hashService: HashService;
  let jwtService: JWTService;
  let apiKeyService: ApiKeyService;

  beforeEach(async () => {
    const dataSourceMock = {
      createEntityManager: jest.fn().mockReturnValue({
        findOne: jest.fn(),
        save: jest.fn(),
        remove: jest.fn(),
      }),
    };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        HashService,
        JWTService,
        ApiKeyService,
        WalletService,
        EventService,
        TrustService,
        TokenService,
        TransferService,
        S3Service,
        {
          provide: getRepositoryToken(WalletRepository),
          useValue: {
            getByName: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(EventRepository),
          useValue: {
            logEvent: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(TrustRepository),
          useValue: {
            getByFilter: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(TokenRepository),
          useValue: {
            countByFilter: jest.fn(),
            countNotClaimedTokenByWallet: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(TransferRepository),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(TransactionRepository),
          useValue: {
            batchCreate: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('some-value'),
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
