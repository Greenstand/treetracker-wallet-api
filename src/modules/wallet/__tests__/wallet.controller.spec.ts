import { Test, TestingModule } from '@nestjs/testing';
import { WalletController } from '../wallet.controller';
import { WalletService } from '../wallet.service';
import { TrustService } from '../../trust/trust.service';
import * as uuid from 'uuid';
import { Readable } from 'stream';
import { Wallet } from '../entity/wallet.entity';
import { TrustFilterDto } from '../../trust/dto/trust-filter.dto';
import { Trust } from '../../trust/entity/trust.entity';
import {
  ENTITY_TRUST_REQUEST_TYPE,
  ENTITY_TRUST_STATE_TYPE,
  ENTITY_TRUST_TYPE,
} from '../../trust/trust-enum';
import { HttpStatus, HttpException } from '@nestjs/common';
import { UpdateWalletDto } from '../dto/update-wallet.dto';

describe('WalletController', () => {
  let walletController: WalletController;
  let walletService: WalletService;
  let trustService: TrustService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WalletController],
      providers: [
        {
          provide: WalletService,
          useValue: {
            getById: jest.fn(),
            updateWallet: jest.fn(),
            batchTransferWallet: jest.fn(),
          },
        },
        {
          provide: TrustService,
          useValue: {
            getTrustRelationships: jest.fn(),
          },
        },
      ],
    }).compile();

    walletController = module.get<WalletController>(WalletController);
    walletService = module.get<WalletService>(WalletService);
    trustService = module.get<TrustService>(TrustService);
  });

  it('getById', async () => {
    const walletId1 = uuid.v4();
    const walletStub = { id: walletId1, name: 'walletId1' } as Wallet;
    jest.spyOn(walletService, 'getById').mockResolvedValue(walletStub);

    const wallet = await walletController.getById(walletId1);

    expect(wallet.id).toBe(walletId1);
    expect(wallet.name).toBe('walletId1');
    expect(walletService.getById).toHaveBeenCalledWith(walletId1);
  });

  it('getTrustRelationships', async () => {
    const walletId = uuid.v4();
    const query: TrustFilterDto = {
      walletId,
      state: ENTITY_TRUST_STATE_TYPE.requested,
      type: ENTITY_TRUST_TYPE.send,
      request_type: ENTITY_TRUST_REQUEST_TYPE.send,
      offset: 0,
      limit: 10,
      sort_by: 'created_at',
      order: 'DESC',
    };

    const trustRelationships: Trust[] = [
      {
        id: uuid.v4(),
        actor_wallet_id: walletId,
        target_wallet_id: uuid.v4(),
        type: ENTITY_TRUST_TYPE.send,
        originator_wallet_id: uuid.v4(),
        request_type: ENTITY_TRUST_REQUEST_TYPE.send,
        state: ENTITY_TRUST_STATE_TYPE.requested,
        created_at: new Date(),
        updated_at: new Date(),
        active: true,
      },
    ];

    jest
      .spyOn(trustService, 'getTrustRelationships')
      .mockResolvedValue(trustRelationships);

    const result = await walletController.getTrustRelationships(
      walletId,
      query,
    );

    expect(trustService.getTrustRelationships).toHaveBeenCalledWith({
      walletId,
      ...query,
    });
    expect(result).toEqual(trustRelationships);
  });

  it('updateWallet', async () => {
    const walletId = uuid.v4();
    const updateWalletDto: UpdateWalletDto = {
      wallet_id: walletId,
      display_name: 'Updated Wallet Name',
      about: 'This is an updated wallet description.',
      add_to_web_map: true,
      logo_image: { buffer: Buffer.from('mockBuffer'), mimetype: 'image/png' },
      cover_image: {
        buffer: Buffer.from('mockBuffer'),
        mimetype: 'image/jpeg',
      },
    };

    // full mock wallet object to meet the type requirements of Wallet
    const updatedWalletResponse = {
      id: walletId,
      name: 'Updated Wallet Name',
      logo_url: 'https://s3.amazonaws.com/mock/logo.png',
      cover_url: 'https://s3.amazonaws.com/mock/cover.jpg',
      password: 'mockPasswordHash',
      salt: 'mockSalt',
      created_at: new Date(),
    };

    const logoImageMock = {
      fieldname: 'logo_image',
      originalname: 'logo.png',
      encoding: '7bit',
      mimetype: 'image/png',
      size: 1024,
      buffer: Buffer.from('mockBuffer'),
      stream: new Readable(), // mock stream object
      destination: '/mock/path',
      filename: 'logo.png',
      path: '/mock/path/logo.png',
    };

    const coverImageMock = {
      fieldname: 'cover_image',
      originalname: 'cover.jpg',
      encoding: '7bit',
      mimetype: 'image/jpeg',
      size: 2048,
      buffer: Buffer.from('mockBuffer'),
      stream: new Readable(), // mock stream object
      destination: '/mock/path',
      filename: 'cover.jpg',
      path: '/mock/path/cover.jpg',
    };

    jest
      .spyOn(walletService, 'updateWallet')
      .mockResolvedValue(updatedWalletResponse);

    const result = await walletController.updateWallet(
      walletId,
      updateWalletDto,
      {
        cover_image: [coverImageMock],
        logo_image: [logoImageMock],
      },
      { user: { walletId } }, // mocked request with user ID
    );

    expect(result).toEqual(updatedWalletResponse);
    expect(walletService.updateWallet).toHaveBeenCalledWith(
      updateWalletDto,
      walletId,
    );
  });

  describe('batchTransfer', () => {
    it('should return batch transfer successful', async () => {
      const transferData = {
        sender_wallet: 'sender_wallet_name',
        token_transfer_amount_default: 100,
        wallet_id: 'sender_wallet_id',
        csvJson: [
          {
            wallet_name: 'recipient_wallet_1',
            token_transfer_amount_overwrite: 50,
          },
          { wallet_name: 'recipient_wallet_2' },
        ],
        filePath: '/path/to/file.csv',
      };

      jest
        .spyOn(walletService, 'batchTransferWallet')
        .mockResolvedValue({ message: 'Batch transfer successful' });

      const result = await walletController.batchTransfer(transferData);

      expect(result).toEqual({ message: 'Batch transfer successful' });
      expect(walletService.batchTransferWallet).toHaveBeenCalledWith(
        transferData.sender_wallet,
        transferData.token_transfer_amount_default,
        transferData.wallet_id,
        transferData.csvJson,
        transferData.filePath,
      );
    });

    it('should return batch transfer failure', async () => {
      const transferData = {
        sender_wallet: 'sender_wallet_name',
        token_transfer_amount_default: 100,
        wallet_id: 'sender_wallet_id',
        csvJson: [
          {
            wallet_name: 'recipient_wallet_1',
            token_transfer_amount_overwrite: 50,
          },
          { wallet_name: 'recipient_wallet_2' },
        ],
        filePath: '/path/to/file.csv',
      };

      jest
        .spyOn(walletService, 'batchTransferWallet')
        .mockRejectedValue(
          new HttpException(
            'Failed to process batch transfer',
            HttpStatus.INTERNAL_SERVER_ERROR,
          ),
        );

      await expect(
        walletController.batchTransfer(transferData),
      ).rejects.toThrow(HttpException);

      expect(walletService.batchTransferWallet).toHaveBeenCalledWith(
        transferData.sender_wallet,
        transferData.token_transfer_amount_default,
        transferData.wallet_id,
        transferData.csvJson,
        transferData.filePath,
      );
    });
  });
});
