import { Test, TestingModule } from '@nestjs/testing';
import { WalletController } from '../wallet.controller';
import { WalletService } from '../wallet.service';
import * as uuid from 'uuid';
import { Wallet } from '../entity/wallet.entity';

describe('WalletController', () => {
  let walletController: WalletController;
  let walletService: WalletService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WalletController],
      providers: [
        {
          provide: WalletService,
          useValue: {
            getById: jest.fn(),
          },
        },
      ],
    }).compile();

    walletController = module.get<WalletController>(WalletController);
    walletService = module.get<WalletService>(WalletService);
  });

  it('getById', async () => {
    const walletId1 = uuid.v4();
    const walletStub = { id: walletId1, name: 'walletId1' } as Wallet;
    jest.spyOn(walletService, 'getById').mockResolvedValue(walletStub);

    const wallet = await walletController.getWalletById(walletId1);

    expect(wallet.id).toBe(walletId1);
    expect(wallet.name).toBe('walletId1');
    expect(walletService.getById).toHaveBeenCalledWith(walletId1);
  });
});
