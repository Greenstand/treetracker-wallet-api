import { Test, TestingModule } from '@nestjs/testing';
import { WalletService } from '../wallet.service';
import { WalletRepository } from '../wallet.repository';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as uuid from 'uuid';
import { Wallet } from '../entity/wallet.entity';
import { TrustRepository } from '../../trust/trust.repository';
import { Trust } from '../../trust/entity/trust.entity';
import { TokenRepository } from '../../token/token.repository';

describe('WalletService', () => {
  let walletService: WalletService;
  let walletRepository: WalletRepository;
  let tokenRepository: TokenRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WalletService,
        {
          provide: getRepositoryToken(WalletRepository),
          useValue: {
            getById: jest.fn(),
            getByName: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(TokenRepository),
          useValue: {
            countByFilter: jest.fn(),
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
    walletRepository = module.get<WalletRepository>(
      getRepositoryToken(WalletRepository),
    );
    tokenRepository = module.get<TokenRepository>(
      getRepositoryToken(TokenRepository),
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
    jest.spyOn(tokenRepository, 'countByFilter').mockResolvedValue(20);
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
    expect(tokenRepository.countByFilter).toHaveBeenCalledWith({
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

  it('getSubWallets', async () => {
    const walletId1 = uuid.v4();
    const trustStub: Trust = {
      id: uuid.v4(),
      actor_wallet_id: 'actor_wallet_id',
      originator_wallet_id: 'originator_wallet_id',
      target_wallet_id: 'target_wallet_id',
      request_type: 'manage',
      state: 'trusted',
      created_at: new Date(),
      updated_at: new Date(),
      type: '',
      active: false,
    };

    jest
      .spyOn(walletService, 'getSubWallets')
      .mockResolvedValue([trustStub, trustStub]);

    const subWallets = await walletService.getSubWallets(walletId1);
    expect(subWallets).toEqual([trustStub, trustStub]);
    expect(walletService.getSubWallets).toHaveBeenCalledWith(walletId1);
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
});
