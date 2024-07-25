import { Test, TestingModule } from '@nestjs/testing';
import { WalletService } from '../wallet.service';
import { WalletRepository } from '../wallet.repository';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as sinon from 'sinon';
import * as uuid from 'uuid';
import { Wallet } from '../entity/wallet.entity';

describe('WalletService', () => {
  let service: WalletService;
  let repository: WalletRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WalletService,
        {
          provide: getRepositoryToken(WalletRepository),
          useValue: {
            getById: sinon.stub(),
            getByName: sinon.stub(),
            // getWallet: sinon.stub(),
            // hasControlOver: sinon.stub(),
            // getSubWallets: sinon.stub(),
            // getAllWallets: sinon.stub(),
          },
        },
      ],
    }).compile();

    service = module.get<WalletService>(WalletService);
    repository = module.get<WalletRepository>(
      getRepositoryToken(WalletRepository),
    );
  });

  afterEach(() => {
    sinon.restore();
  });

  it('getById', async () => {
    const walletId1 = uuid.v4();
    const walletStub = { id: walletId1, name: 'walletId1' } as Wallet;
    (repository.getById as sinon.SinonStub).resolves(walletStub);

    const wallet = await service.getById(walletId1);
    expect(wallet.id).toBe(walletId1);
    expect(wallet.name).toBe('walletId1');
  });

  // todo: getByName
  // todo: getByName
  // todo: hasControlOver
  // todo: getSubWallets
});

// todo: describe('getByIdOrName', () => {});
// todo: describe('createWallet', () => {});
// todo: describe('getAllWallets', () => {});
