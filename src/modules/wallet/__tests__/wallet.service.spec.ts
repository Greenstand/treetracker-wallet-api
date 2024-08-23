import { Test, TestingModule } from '@nestjs/testing';
import { WalletService } from '../wallet.service';
import { WalletRepository } from '../wallet.repository';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as uuid from 'uuid';
import { Wallet } from '../entity/wallet.entity';
import { TrustRepository } from '../../trust/trust.repository';
import {
  ENTITY_TRUST_REQUEST_TYPE,
  ENTITY_TRUST_STATE_TYPE,
} from '../../trust/trust-enum';
import { TokenService } from '../../token/token.service';
import { EventService } from '../../event/event.service';
import { TrustService } from '../../trust/trust.service';
import { EventRepository } from '../../event/event.repository';
import { TokenRepository } from '../../token/token.repository';

describe('WalletService', () => {
  let walletService: WalletService;
  let tokenService: TokenService;
  let trustService: TrustService;
  let walletRepository: WalletRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WalletService,
        TokenService,
        EventService,
        TrustService,
        {
          provide: getRepositoryToken(WalletRepository),
          useValue: {
            getById: jest.fn(),
            getByName: jest.fn(),
            getAllWallets: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(TokenRepository),
          useValue: {
            countByFilter: jest.fn(),
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
      ],
    }).compile();

    walletService = module.get<WalletService>(WalletService);
    tokenService = module.get<TokenService>(TokenService);
    trustService = module.get<TrustService>(TrustService);
    walletRepository = module.get<WalletRepository>(
      getRepositoryToken(WalletRepository),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('getById', async () => {
    const walletId1 = uuid.v4();
    const walletStub = { id: walletId1, name: 'walletId1' } as Wallet;
    jest.spyOn(walletRepository, 'getById').mockResolvedValue(walletStub);

    const wallet = await walletService.getById(walletId1);
    expect(wallet.id).toBe(walletId1);
    expect(wallet.name).toBe('walletId1');
    expect(walletRepository.getById).toHaveBeenCalledWith(walletId1);
  });

  it('getWallet', async () => {
    const authenticatedWalletId = uuid.v4();
    const walletId = uuid.v4();

    jest
      .spyOn(walletRepository, 'getById')
      .mockResolvedValue({ id: walletId, name: 'wallet' } as Wallet);
    jest.spyOn(tokenService, 'countByFilter').mockResolvedValue(20);
    jest.spyOn(walletService, 'hasControlOver').mockResolvedValue(true);

    const result = await walletService.getWallet(
      authenticatedWalletId,
      walletId,
    );

    expect(result).toEqual({
      id: walletId,
      wallet: 'wallet',
      tokens_in_wallet: 20,
    });
    expect(walletRepository.getById).toHaveBeenCalledWith(walletId);
    expect(walletService.hasControlOver).toHaveBeenCalledWith(
      authenticatedWalletId,
      walletId,
    );
    expect(tokenService.countByFilter).toHaveBeenCalledWith({
      wallet_id: walletId,
    });
  });

  it('getByName', async () => {
    const walletName = 'walletName';
    const walletId1 = uuid.v4();
    const walletStub = { id: walletId1, name: walletName } as Wallet;
    jest.spyOn(walletRepository, 'getByName').mockResolvedValue(walletStub);

    const wallet = await walletService.getByName(walletName);
    expect(wallet.id).toBe(walletId1);
    expect(wallet.name).toBe(walletName);
    expect(walletRepository.getByName).toHaveBeenCalledWith(walletName);
  });

  describe('hasControlOver', () => {
    let getSubWalletsSpy;

    const walletId1 = uuid.v4();
    const walletId2 = uuid.v4();

    beforeEach(() => {
      getSubWalletsSpy = jest.spyOn(walletService, 'getSubWallets');
    });

    it('should return true — my wallet', async () => {
      const result = await walletService.hasControlOver(walletId1, walletId1);

      expect(result).toEqual(true);
      expect(getSubWalletsSpy).not.toHaveBeenCalled();
    });

    it('should return true — subwallet', async () => {
      getSubWalletsSpy.mockResolvedValue([1]);

      const result = await walletService.hasControlOver(walletId1, walletId2);

      expect(result).toEqual(true);
      expect(getSubWalletsSpy).toHaveBeenCalledTimes(1);
      expect(getSubWalletsSpy).toHaveBeenCalledWith(walletId1, walletId2);
    });

    it('should return false when no control is present', async () => {
      getSubWalletsSpy.mockResolvedValue([]);

      const result = await walletService.hasControlOver(walletId1, walletId2);

      expect(result).toEqual(false);
      expect(getSubWalletsSpy).toHaveBeenCalledTimes(1);
      expect(getSubWalletsSpy).toHaveBeenCalledWith(walletId1, walletId2);
    });
  });

  describe('getSubWallets', () => {
    let trustServiceStub;

    const walletId1 = uuid.v4();
    const walletId2 = uuid.v4();

    beforeEach(() => {
      trustServiceStub = jest.spyOn(trustService, 'getByFilter');
    });

    it('should get sub wallets without specific childId', async () => {
      trustServiceStub.mockResolvedValue(['wallet1']);

      const result = await walletService.getSubWallets(walletId1);

      expect(result).toEqual(['wallet1']);
      expect(trustServiceStub).toHaveBeenCalledTimes(1);
      expect(trustServiceStub).toHaveBeenCalledWith({
        or: [
          {
            and: [
              { actor_wallet_id: walletId1 },
              {
                request_type: ENTITY_TRUST_REQUEST_TYPE.manage,
              },
              { state: ENTITY_TRUST_STATE_TYPE.trusted },
            ],
          },
          {
            and: [
              {
                request_type: ENTITY_TRUST_REQUEST_TYPE.yield,
              },
              { target_wallet_id: walletId1 },
              { state: ENTITY_TRUST_STATE_TYPE.trusted },
            ],
          },
        ],
      });
    });

    it('should get sub wallets with specific childId', async () => {
      trustServiceStub.mockResolvedValue(['wallet2']);

      const result = await walletService.getSubWallets(walletId1, walletId2);

      expect(result).toEqual(['wallet2']);
      expect(trustServiceStub).toHaveBeenCalledTimes(1);
      expect(trustServiceStub).toHaveBeenCalledWith({
        or: [
          {
            and: [
              { actor_wallet_id: walletId1 },
              { request_type: ENTITY_TRUST_REQUEST_TYPE.manage },
              { state: ENTITY_TRUST_STATE_TYPE.trusted },
              { target_wallet_id: walletId2 },
            ],
          },
          {
            and: [
              { request_type: ENTITY_TRUST_REQUEST_TYPE.yield },
              { target_wallet_id: walletId1 },
              { state: ENTITY_TRUST_STATE_TYPE.trusted },
              { actor_wallet_id: walletId2 },
            ],
          },
        ],
      });
    });
  });

  describe('getByIdOrName', () => {
    const walletId = uuid.v4();
    const walletName = 'walletName';

    beforeEach(() => {
      jest
        .spyOn(walletRepository, 'getById')
        .mockResolvedValue({ id: walletId, name: walletName } as Wallet);
      jest
        .spyOn(walletRepository, 'getByName')
        .mockResolvedValue({ id: walletId, name: walletName } as Wallet);
    });

    it('sending a name as the parameter', async () => {
      const wallet = await walletService.getByIdOrName(walletName);
      expect(walletRepository.getByName).toHaveBeenCalledWith(walletName);
      expect(walletRepository.getById).not.toHaveBeenCalled();
      expect(wallet.name).toBe(walletName);
      expect(wallet.id).toBe(walletId);
    });

    it('sending an id as the parameter', async () => {
      const wallet = await walletService.getByIdOrName(walletId);
      expect(walletRepository.getById).toHaveBeenCalledWith(walletId);
      expect(walletRepository.getByName).not.toHaveBeenCalled();
      expect(wallet.name).toBe(walletName);
      expect(wallet.id).toBe(walletId);
    });
  });

  describe('getAllWallets', () => {
    let getAllWalletsSpy;
    let countTokenByWalletSpy;

    const walletId1 = uuid.v4();
    const walletId2 = uuid.v4();
    const limitOptions = {
      limit: 10,
      offset: 0,
    };
    const resultWithoutTokens = [
      {
        id: walletId1,
        name: 'walletName',
        logo_url: 'http://test.com/logo1.png',
        password: 'mockPassword',
        salt: 'mockSalt',
        created_at: new Date(),
      },
      {
        id: walletId2,
        name: 'walletName2',
        logo_url: 'http://test.com/logo2.png',
        password: 'mockPassword2',
        salt: 'mockSalt2',
        created_at: new Date(),
      },
    ];

    const count = 2;

    beforeEach(() => {
      getAllWalletsSpy = jest
        .spyOn(walletRepository, 'getAllWallets')
        .mockResolvedValue({
          wallets: resultWithoutTokens,
          count,
        });
      countTokenByWalletSpy = jest.spyOn(tokenService, 'countTokenByWallet');
    });

    it('should get all wallets without getTokenCount', async () => {
      const id = uuid.v4();

      const allWallets = await walletService.getAllWallets(
        id,
        limitOptions,
        'name',
        'created_at',
        'ASC',
        undefined,
        undefined,
        false, // getTokenCount = false
        true, // getWalletCount = true
      );

      expect(getAllWalletsSpy).toHaveBeenCalledTimes(1);
      expect(getAllWalletsSpy).toHaveBeenCalledWith(
        id,
        limitOptions,
        'name',
        'created_at',
        'ASC',
        undefined,
        undefined,
        true, // getWalletCount = true
      );

      // Adjusting the expected result to exclude tokens_in_wallet
      expect(allWallets).toEqual({ wallets: resultWithoutTokens, count });
      expect(countTokenByWalletSpy).not.toHaveBeenCalled();
    });

    it('should get all wallets with getTokenCount', async () => {});
  });
});
