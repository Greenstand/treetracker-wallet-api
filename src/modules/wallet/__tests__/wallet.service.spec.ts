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
  ENTITY_TRUST_TYPE,
} from '../../trust/trust-enum';
import { TokenService } from '../../token/token.service';
import { EventService } from '../../event/event.service';
import { TrustService } from '../../trust/trust.service';
import { EventRepository } from '../../event/event.repository';
import { TokenRepository } from '../../token/token.repository';
import { EVENT_TYPES } from '../../event/event-enum';
import { S3Service } from '../../../common/services/s3.service';
import { UpdateWalletDto } from '../dto/update-wallet.dto';
import { TransferService } from '../../transfer/transfer.service';
import { TransferRepository } from '../../transfer/transfer.repository';
import { TransactionRepository } from '../../transaction/transaction.repository';
import * as fs from 'fs';

jest.mock('fs', () => ({
  promises: {
    unlink: jest.fn(),
  },
}));

describe('WalletService', () => {
  let walletService: WalletService;
  let tokenService: TokenService;
  let transferService: TransferService;
  let trustService: TrustService;
  let eventService: EventService;
  let s3Service: S3Service;
  let walletRepository: WalletRepository;

  beforeEach(async () => {
    // mock environment variables
    process.env.S3_BUCKET = 'mock-bucket';
    process.env.S3_REGION = 'mock-region';

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WalletService,
        TokenService,
        EventService,
        TrustService,
        TransferService,
        S3Service,
        {
          provide: getRepositoryToken(WalletRepository),
          useValue: {
            getById: jest.fn(),
            getByName: jest.fn(),
            getAllWallets: jest.fn(),
            createWallet: jest.fn(),
            updateWallet: jest.fn(),
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
        {
          provide: getRepositoryToken(TransferRepository),
          useValue: {},
        },
        {
          provide: getRepositoryToken(TransactionRepository),
          useValue: {},
        },
      ],
    }).compile();

    walletService = module.get<WalletService>(WalletService);
    tokenService = module.get<TokenService>(TokenService);
    transferService = module.get<TransferService>(TransferService);
    trustService = module.get<TrustService>(TrustService);
    eventService = module.get<EventService>(EventService);
    s3Service = module.get<S3Service>(S3Service);
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

  describe('createWallet', () => {
    let createWalletSpy;
    let logEventSpy;
    let createTrustSpy;

    const loggedInWalletId = uuid.v4();
    const walletName = 'walletName';
    const createdWalletId = uuid.v4();

    const createdWallet = {
      id: createdWalletId,
      name: walletName,
      password: 'mockPassword',
      salt: 'mockSalt',
      logo_url: 'http://test.com/logo.png',
      cover_url: 'http://test.com/cover.png',
      created_at: new Date(),
    };

    beforeEach(() => {
      createWalletSpy = jest
        .spyOn(walletRepository, 'createWallet')
        .mockResolvedValue(createdWallet);
      logEventSpy = jest
        .spyOn(eventService, 'logEvent')
        .mockImplementation(async () => ({}) as any);
      createTrustSpy = jest
        .spyOn(trustService, 'createTrust')
        .mockImplementation(async () => ({}) as any);
    });

    it('should create wallet and log events', async () => {
      const result = await walletService.createWallet(
        loggedInWalletId,
        walletName,
      );

      // ensure the createWallet method is called once with the correct arguments
      expect(createWalletSpy).toHaveBeenCalledTimes(1);
      expect(createWalletSpy).toHaveBeenCalledWith(walletName);

      // ensure the wallet is returned as expected
      expect(result).toEqual(createdWallet);

      // ensure the logEvent method is called twice with the correct arguments
      expect(logEventSpy).toHaveBeenCalledTimes(2);
      expect(logEventSpy).toHaveBeenNthCalledWith(1, {
        wallet_id: createdWalletId,
        type: EVENT_TYPES.wallet_created,
      });
      expect(logEventSpy).toHaveBeenNthCalledWith(2, {
        wallet_id: loggedInWalletId,
        type: EVENT_TYPES.wallet_created,
      });

      // ensure the createTrust method is called with the correct arguments
      expect(createTrustSpy).toHaveBeenCalledTimes(1);
      expect(createTrustSpy).toHaveBeenCalledWith({
        actor_wallet_id: loggedInWalletId,
        originator_wallet_id: loggedInWalletId,
        target_wallet_id: createdWalletId,
        request_type: ENTITY_TRUST_TYPE.manage,
        type: ENTITY_TRUST_TYPE.manage,
        state: ENTITY_TRUST_STATE_TYPE.trusted,
      });
    });

    it('should rollback transaction if it errors out', async () => {
      createWalletSpy.mockRejectedValue(new Error('Test Error'));

      const loggedInWalletId = uuid.v4();
      const walletName = 'walletName';

      try {
        await walletService.createWallet(loggedInWalletId, walletName);
      } catch (e) {
        // expected error, so do nothing here
      }

      // ensure createWallet was called once with the correct arguments
      expect(createWalletSpy).toHaveBeenCalledTimes(1);
      expect(createWalletSpy).toHaveBeenCalledWith(walletName);

      // ensure logEvent was not called due to the error
      expect(logEventSpy).not.toHaveBeenCalled();
    });
  });

  describe('getAllWallets', () => {
    let getAllWalletsSpy;
    let countTokenByWalletSpy;

    const walletId1 = uuid.v4();
    const walletId2 = uuid.v4();
    const paginationOptions = {
      limit: 10,
      offset: 0,
    };
    const resultWithoutTokens = [
      {
        id: walletId1,
        name: 'walletName',
        password: 'mockPassword',
        salt: 'mockSalt',
        logo_url: 'http://test.com/logo1.png',
        cover_url: 'http://test.com/cover1.png',
        created_at: new Date(),
      },
      {
        id: walletId2,
        name: 'walletName2',
        password: 'mockPassword2',
        salt: 'mockSalt2',
        logo_url: 'http://test.com/logo2.png',
        cover_url: 'http://test.com/cover2.png',
        created_at: new Date(),
      },
    ];

    const resultWithTokens = [
      {
        id: walletId1,
        name: 'walletName',
        password: 'mockPassword',
        salt: 'mockSalt',
        logo_url: 'http://test.com/logo1.png',
        cover_url: 'http://test.com/cover1.png',
        tokens_in_wallet: 2,
        created_at: new Date(),
      },
      {
        id: walletId2,
        name: 'walletName2',
        password: 'mockPassword2',
        salt: 'mockSalt2',
        logo_url: 'http://test.com/logo2.png',
        cover_url: 'http://test.com/cover2.png',
        tokens_in_wallet: 4,
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
      countTokenByWalletSpy = jest
        .spyOn(tokenService, 'countTokenByWallet')
        .mockResolvedValueOnce(2)
        .mockResolvedValueOnce(4);
    });

    it('should get all wallets without getTokenCount', async () => {
      const id = uuid.v4();

      const allWallets = await walletService.getAllWallets(
        id,
        paginationOptions,
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
        paginationOptions,
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

    it('should get all wallets with getTokenCount', async () => {
      const id = uuid.v4();

      const allWallets = await walletService.getAllWallets(
        id,
        paginationOptions,
        'name',
        'created_at',
        'ASC',
        undefined,
        undefined,
        true, // getTokenCount = true
        true, // getWalletCount = true
      );

      expect(getAllWalletsSpy).toHaveBeenCalledTimes(1);
      expect(getAllWalletsSpy).toHaveBeenCalledWith(
        id,
        paginationOptions,
        'name',
        'created_at',
        'ASC',
        undefined,
        undefined,
        true, // getWalletCount = true
      );

      expect(countTokenByWalletSpy).toHaveBeenCalledTimes(2);
      expect(countTokenByWalletSpy).toHaveBeenCalledWith(walletId1);
      expect(countTokenByWalletSpy).toHaveBeenCalledWith(walletId2);

      expect(allWallets).toEqual({
        wallets: resultWithTokens,
        count,
      });
    });
  });

  describe('updateWallet', () => {
    let hasControlOverByNameSpy;
    let updateWalletSpy;
    let s3UploadLogoSpy;
    let s3UploadCoverSpy;
    let addWalletToMapConfigSpy;

    const walletIdToUpdate = uuid.v4();
    const loggedInWalletId = uuid.v4();

    const updateWalletDto: UpdateWalletDto = {
      wallet_id: walletIdToUpdate,
      display_name: 'Updated Wallet Name',
      add_to_web_map: false,
      logo_image: undefined,
      cover_image: undefined,
    };

    const mockWallet: Wallet = {
      id: walletIdToUpdate,
      name: 'Mock Wallet Name',
      logo_url: 'http://test.com/mock-logo.png',
      cover_url: 'http://test.com/mock-cover.png',
      password: 'mockPassword',
      salt: 'mockSalt',
      created_at: new Date(),
    };

    const updatedWallet = {
      id: walletIdToUpdate,
      name: 'Updated Wallet Name',
      logo_url: null, // empty logo_url as expected in test 1
      cover_url: 'http://test.com/cover.png', // original cover_url prepared for test 2
    };

    beforeEach(() => {
      hasControlOverByNameSpy = jest
        .spyOn(walletService, 'hasControlOverByName')
        .mockResolvedValue(mockWallet);
      updateWalletSpy = jest
        .spyOn(walletRepository, 'updateWallet')
        .mockResolvedValue(updatedWallet as Wallet);
      s3UploadLogoSpy = jest
        .spyOn(s3Service, 'upload')
        .mockResolvedValue('http://test.com/logo.png'); // URL for logo image upload
      s3UploadCoverSpy = jest
        .spyOn(s3Service, 'upload')
        .mockResolvedValue('http://test.com/cover.png'); // URL for cover image upload
      addWalletToMapConfigSpy = jest
        .spyOn(walletService, 'addWalletToMapConfig')
        .mockResolvedValue(undefined);
    });

    it('should update the wallet successfully with an empty logo_url', async () => {
      const updateWalletDtoWithEmptyLogo = {
        ...updateWalletDto,
        logo_image: undefined, // no logo_image provided
      };

      const result = await walletService.updateWallet(
        updateWalletDtoWithEmptyLogo,
        loggedInWalletId,
      );

      expect(hasControlOverByNameSpy).toHaveBeenCalledTimes(1);
      expect(hasControlOverByNameSpy).toHaveBeenCalledWith(
        loggedInWalletId,
        walletIdToUpdate,
      );

      expect(updateWalletSpy).toHaveBeenCalledTimes(1);
      expect(updateWalletSpy).toHaveBeenCalledWith({
        id: walletIdToUpdate,
        name: 'Updated Wallet Name',
        logo_url: undefined, // expecting undefined for logo_url
        cover_url: undefined, // expecting undefined for cover_url
      });

      expect(s3UploadLogoSpy).not.toHaveBeenCalled(); // no logo upload
      expect(addWalletToMapConfigSpy).not.toHaveBeenCalled();
      expect(result).toEqual(updatedWallet);
    });

    it('should update the wallet and upload the cover image', async () => {
      const updateWalletDtoWithCover = {
        ...updateWalletDto,
        cover_image: {
          buffer: Buffer.from('some_image_data'),
          mimetype: 'image/png',
        },
      };

      const result = await walletService.updateWallet(
        updateWalletDtoWithCover,
        loggedInWalletId,
      );

      expect(hasControlOverByNameSpy).toHaveBeenCalledTimes(1);
      expect(hasControlOverByNameSpy).toHaveBeenCalledWith(
        loggedInWalletId,
        walletIdToUpdate,
      );

      expect(s3UploadCoverSpy).toHaveBeenCalledTimes(1);
      expect(s3UploadCoverSpy).toHaveBeenCalledWith(
        updateWalletDtoWithCover.cover_image.buffer,
        expect.stringContaining(walletIdToUpdate),
        'image/png',
      );

      expect(updateWalletSpy).toHaveBeenCalledTimes(1);
      expect(updateWalletSpy).toHaveBeenCalledWith({
        id: walletIdToUpdate,
        name: 'Updated Wallet Name',
        cover_url: 'http://test.com/cover.png', // new cover_url as expected
      });

      expect(addWalletToMapConfigSpy).not.toHaveBeenCalled();
      expect(result).toEqual(updatedWallet);
    });

    it('should throw an error if the logged-in wallet does not have control', async () => {
      hasControlOverByNameSpy.mockResolvedValueOnce(false);

      await expect(
        walletService.updateWallet(updateWalletDto, loggedInWalletId),
      ).rejects.toThrow('You do not have permission to update this wallet');

      expect(hasControlOverByNameSpy).toHaveBeenCalledTimes(1);
      expect(hasControlOverByNameSpy).toHaveBeenCalledWith(
        loggedInWalletId,
        walletIdToUpdate,
      );

      expect(updateWalletSpy).not.toHaveBeenCalled();
      expect(s3UploadLogoSpy).not.toHaveBeenCalled();
      expect(addWalletToMapConfigSpy).not.toHaveBeenCalled();
    });

    it('should update the wallet and add it to the map config if add_to_web_map is true', async () => {
      const updateWalletDtoWithMapConfig = {
        ...updateWalletDto,
        add_to_web_map: true,
      };

      const result = await walletService.updateWallet(
        updateWalletDtoWithMapConfig,
        loggedInWalletId,
      );

      expect(hasControlOverByNameSpy).toHaveBeenCalledTimes(1);
      expect(hasControlOverByNameSpy).toHaveBeenCalledWith(
        loggedInWalletId,
        walletIdToUpdate,
      );

      expect(updateWalletSpy).toHaveBeenCalledTimes(1);
      expect(updateWalletSpy).toHaveBeenCalledWith({
        id: walletIdToUpdate,
        name: 'Updated Wallet Name',
        logo_url: undefined,
      });

      expect(addWalletToMapConfigSpy).toHaveBeenCalledTimes(1);
      expect(addWalletToMapConfigSpy).toHaveBeenCalledWith({
        walletId: walletIdToUpdate,
        walletLogoUrl: undefined,
      });

      expect(result).toEqual(updatedWallet);
    });
  });

  describe('batchCreateWallet', () => {
    it('should successfully create wallets and transfer tokens', async () => {
      const mockSenderWallet: Wallet = {
        id: uuid.v4(),
        name: 'Mock Wallet Name',
        logo_url: 'http://test.com/mock-logo.png',
        cover_url: 'http://test.com/mock-cover.png',
        password: 'mockPassword',
        salt: 'mockSalt',
        created_at: new Date(),
      };
      const mockCreatedWallet: Wallet = {
        id: uuid.v4(),
        name: 'Mock Created Wallet Name',
        logo_url: 'http://test.com/mock-logo.png',
        cover_url: 'http://test.com/mock-cover.png',
        password: 'mockPassword',
        salt: 'mockSalt',
        created_at: new Date(),
      };

      jest
        .spyOn(walletService, 'getByName')
        .mockResolvedValueOnce(mockSenderWallet);
      jest
        .spyOn(walletService, 'createWallet')
        .mockResolvedValue(mockCreatedWallet);
      jest
        .spyOn(tokenService, 'countTokenByWallet')
        .mockResolvedValueOnce(1000);
      jest
        .spyOn(transferService, 'transferBundle')
        .mockResolvedValue(undefined);
      jest
        .spyOn(walletService, 'addWalletToMapConfig')
        .mockResolvedValue(undefined);

      const senderWallet = 'sender_wallet';
      const tokenTransferAmountDefault = 100;
      const walletId = 'parent_wallet_id';
      const csvJson = [
        { wallet_name: 'wallet1', token_transfer_amount_overwrite: 50 },
        { wallet_name: 'wallet2' },
      ];
      const filePath = '/path/to/file.csv';

      const result = await walletService.batchCreateWallet(
        senderWallet,
        tokenTransferAmountDefault,
        walletId,
        csvJson,
        filePath,
      );

      expect(result).toEqual({
        message: 'Batch wallet creation successful',
      });
      expect(walletService.getByName).toHaveBeenCalledWith(senderWallet);
      expect(walletService.createWallet).toHaveBeenCalledTimes(2);
      expect(transferService.transferBundle).toHaveBeenCalledTimes(2);
      expect(fs.promises.unlink).toHaveBeenCalledWith(filePath);
    });
  });
});
