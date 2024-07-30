import { Test, TestingModule } from '@nestjs/testing';
import { WalletService } from '../wallet.service';
import { WalletRepository } from '../wallet.repository';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as sinon from 'sinon';
import * as uuid from 'uuid';
import { Wallet } from '../entity/wallet.entity';
import { TrustRepository } from '../../trust/trust.repository';
import { Trust } from '../../trust/entity/trust.entity';
import { TokenRepository } from '../../token/token.repository';

describe('WalletService', () => {
  let walletService: WalletService;
  let walletRepository: WalletRepository;
  let tokenRepository: TokenRepository;

  let getByIdStub: sinon.SinonStub;
  let getByNameStub: sinon.SinonStub;
  let countByFilterStub: sinon.SinonStub;
  let hasControlOverStub: sinon.SinonStub;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WalletService,
        {
          provide: getRepositoryToken(WalletRepository),
          useValue: {
            getById: sinon.stub(),
            getByName: sinon.stub(),
            // getAllWallets: sinon.stub(),
          },
        },
        {
          provide: getRepositoryToken(TokenRepository),
          useValue: {
            countByFilter: sinon.stub(),
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

    // Initialize stubs
    getByIdStub = walletRepository.getById as sinon.SinonStub;
    getByNameStub = walletRepository.getByName as sinon.SinonStub;
    countByFilterStub = tokenRepository.countByFilter as sinon.SinonStub;
    hasControlOverStub = sinon.stub(walletService, 'hasControlOver');
  });

  afterEach(() => {
    sinon.restore();
  });

  it('getById', async () => {
    const walletId1 = uuid.v4();
    const walletStub = { id: walletId1, name: 'walletId1' } as Wallet;
    getByIdStub.resolves(walletStub);

    const wallet = await walletService.getById(walletId1);
    expect(wallet.id).toBe(walletId1);
    expect(wallet.name).toBe('walletId1');
  });

  it('getWallet', async () => {
    const authenticatedWalletId = uuid.v4();
    const walletId = uuid.v4();

    getByIdStub.resolves({ id: walletId, name: 'wallet' } as Wallet);
    countByFilterStub.resolves(20);
    hasControlOverStub.resolves(true);

    const result = await walletService.getWallet(
      authenticatedWalletId,
      walletId,
    );

    expect(result).toEqual({
      id: walletId,
      wallet: 'wallet',
      tokens_in_wallet: 20,
    });
    expect(getByIdStub.calledOnceWithExactly(walletId)).toBe(true);
    expect(
      hasControlOverStub.calledOnceWithExactly(authenticatedWalletId, walletId),
    ).toBe(true);
    expect(
      countByFilterStub.calledOnceWithExactly({ wallet_id: walletId }),
    ).toBe(true);
  });

  it('getByName', async () => {
    const walletName = 'walletName';
    const walletId1 = uuid.v4();
    const walletStub = { id: walletId1, name: walletName } as Wallet;
    getByNameStub.resolves(walletStub);

    const wallet = await walletService.getByName(walletName);
    expect(wallet.id).toBe(walletId1);
    expect(wallet.name).toBe(walletName);
  });

  // todo: hasControlOver
  // it('hasControlOver', async () => {})

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

    const getSubWalletsStub = sinon
      .stub(walletService, 'getSubWallets')
      .resolves([trustStub, trustStub]);

    expect(walletService).toBeInstanceOf(WalletService);
    const subWallets = await walletService.getSubWallets(walletId1);
    expect(subWallets).toEqual([trustStub, trustStub]);
    expect(getSubWalletsStub.calledOnceWithExactly(walletId1)).toBe(true);
    getSubWalletsStub.restore();
  });

  describe('getByIdOrName', () => {
    const walletId = uuid.v4();
    const walletName = 'walletName';

    beforeEach(() => {
      // Reset stubs before each test
      getByIdStub.reset();
      getByNameStub.reset();

      // Setup the stubs with specific behavior for the tests
      getByIdStub.resolves({ id: walletId, name: walletName } as Wallet);
      getByNameStub.resolves({ id: walletId, name: walletName } as Wallet);
    });

    it('sending a name as the parameter', async () => {
      const wallet = await walletService.getByIdOrName(walletName);
      expect(getByNameStub.calledOnceWithExactly(walletName)).toBe(true);
      expect(getByIdStub.notCalled).toBe(true);
      expect(wallet.name).toBe(walletName);
      expect(wallet.id).toBe(walletId);
    });

    it('sending an id as the parameter', async () => {
      const wallet = await walletService.getByIdOrName(walletId);
      expect(getByIdStub.calledOnceWithExactly(walletId)).toBe(true);
      expect(getByNameStub.notCalled).toBe(true);
      expect(wallet.name).toBe(walletName);
      expect(wallet.id).toBe(walletId);
    });
  });

  // todo
  // describe('createWallet', () => {})

  // todo
  // describe('getAllWallets', () => {})
});
