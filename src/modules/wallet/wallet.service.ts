import {
  Injectable,
  HttpException,
  HttpStatus,
  Logger,
  forwardRef,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WalletRepository } from './wallet.repository';
import { validate as uuidValidate } from 'uuid';
import {
  ENTITY_TRUST_REQUEST_TYPE,
  ENTITY_TRUST_STATE_TYPE,
  ENTITY_TRUST_TYPE,
} from '../trust/trust-enum';
import { Trust } from '../trust/entity/trust.entity';
import { Wallet } from './entity/wallet.entity';
import { TokenService } from '../token/token.service';
import { EventService } from '../event/event.service';
import { EVENT_TYPES } from '../event/event-enum';
import { TrustService } from '../trust/trust.service';
import { S3Service } from '../../common/services/s3.service';
import axios, { AxiosResponse } from 'axios';
import { UpdateWalletDto } from './dto/update-wallet.dto';
import { TransferService } from '../transfer/transfer.service';
import * as fs from 'fs/promises';

interface FilterCondition {
  actor_wallet_id?: string;
  request_type?: ENTITY_TRUST_REQUEST_TYPE;
  state?: ENTITY_TRUST_STATE_TYPE;
  target_wallet_id?: string;
}

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  constructor(
    @InjectRepository(WalletRepository)
    private walletRepository: WalletRepository,
    private trustService: TrustService,
    private tokenService: TokenService,
    private eventService: EventService,
    @Inject(forwardRef(() => TransferService))
    private transferService: TransferService,
    private s3Service: S3Service,
  ) {}

  async getById(id: string) {
    return this.walletRepository.getById(id);
  }

  async getByName(name: string) {
    return this.walletRepository.getByName(name);
  }

  async getByIdOrName(idOrName: string) {
    if (uuidValidate(idOrName)) {
      return this.getById(idOrName);
    } else {
      return this.getByName(idOrName);
    }
  }

  /*
   * Get all wallet managed by me(parentId)
   * Optionally get a specific subwallet
   */
  async getSubWallets(parentId: string, childId?: string): Promise<Trust[]> {
    const filter: { or: { and: FilterCondition[] }[] } = {
      or: [
        {
          and: [
            { actor_wallet_id: parentId },
            { request_type: ENTITY_TRUST_REQUEST_TYPE.manage },
            { state: ENTITY_TRUST_STATE_TYPE.trusted },
          ],
        },
        {
          and: [
            { request_type: ENTITY_TRUST_REQUEST_TYPE.yield },
            { target_wallet_id: parentId },
            { state: ENTITY_TRUST_STATE_TYPE.trusted },
          ],
        },
      ],
    };

    if (childId) {
      filter.or[0].and.push({
        target_wallet_id: childId,
      });
      filter.or[1].and.push({
        actor_wallet_id: childId,
      });
    }

    const result = await this.trustService.getByFilter(filter);

    return result;
  }

  async getWallet(loggedInWalletId: string, walletId: string): Promise<any> {
    const wallet = await this.walletRepository.getById(walletId);

    if (!(await this.hasControlOver(loggedInWalletId, walletId))) {
      throw new HttpException(
        'Have no permission to access this wallet',
        HttpStatus.FORBIDDEN,
      );
    }

    const tokenCount = await this.tokenService.countByFilter({
      wallet_id: walletId,
    });

    const walletName = wallet.name;
    return { id: walletId, wallet: walletName, tokens_in_wallet: tokenCount };
  }

  async hasControlOver(parentId: string, childId: string): Promise<boolean> {
    if (parentId === childId) {
      this.logger.debug('The same wallet');
      return true;
    }

    const result = await this.getSubWallets(parentId, childId);
    return result.length > 0;
  }

  async hasControlOverByName(
    parentId: string,
    childName: string,
  ): Promise<Wallet> {
    const walletInstance = await this.getByName(childName);
    if (!walletInstance) {
      throw new HttpException('Wallet not found', HttpStatus.NOT_FOUND);
    }

    const isSub = await this.hasControlOver(parentId, walletInstance.id);
    if (!isSub) {
      throw new HttpException(
        'Wallet does not belong to the logged in wallet',
        HttpStatus.FORBIDDEN,
      );
    }

    return walletInstance;
  }

  async getAllWallets(
    id: string,
    paginationOptions: any,
    name: string,
    sortBy: string,
    order: string,
    createdAtStartDate: Date,
    createdAtEndDate: Date,
    getTokenCount = true,
    getWalletCount = true,
  ): Promise<{ wallets: Wallet[]; count: number }> {
    const { wallets, count } = await this.walletRepository.getAllWallets(
      id,
      paginationOptions,
      name,
      sortBy,
      order,
      createdAtStartDate,
      createdAtEndDate,
      getWalletCount,
    );

    if (getTokenCount) {
      const walletsWithTokens = await Promise.all(
        wallets.map(async (wallet) => {
          const tokensInWallet = await this.tokenService.countTokenByWallet(
            wallet.id,
          );
          return { ...wallet, tokens_in_wallet: tokensInWallet };
        }),
      );

      return {
        wallets: walletsWithTokens,
        count: count,
      };
    }

    return { wallets, count };
  }

  async createWallet(
    loggedInWalletId: string,
    walletName: string,
  ): Promise<Wallet> {
    // create the wallet entity
    const addedWallet = await this.walletRepository.createWallet(walletName);

    // log event for the newly created wallet
    await this.eventService.logEvent({
      wallet_id: addedWallet.id,
      type: EVENT_TYPES.wallet_created,
      // payload: {
      //   parentWallet: loggedInWalletId,
      //   childWallet: addedWallet.name,
      // },
    });

    // log event for the parent wallet
    await this.eventService.logEvent({
      wallet_id: loggedInWalletId,
      type: EVENT_TYPES.wallet_created,
      // payload: {
      //   parentWallet: loggedInWalletId,
      //   childWallet: addedWallet.name,
      // },
    });

    // create the trust relationship
    await this.trustService.createTrust({
      actor_wallet_id: loggedInWalletId,
      originator_wallet_id: loggedInWalletId,
      target_wallet_id: addedWallet.id,
      request_type: ENTITY_TRUST_TYPE.manage,
      type: ENTITY_TRUST_TYPE.manage,
      state: ENTITY_TRUST_STATE_TYPE.trusted,
    });

    return addedWallet;
  }

  async addWalletToMapConfig({
    walletId,
    walletLogoUrl,
    walletCoverUrl,
    name,
  }: {
    walletId: string;
    walletLogoUrl?: string;
    walletCoverUrl?: string;
    name?: string;
  }): Promise<any> {
    const MAP_CONFIG_API_URL =
      process.env.MAP_CONFIG_API_URL ||
      'http://treetracker-map-config-api.webmap-config';

    try {
      const response: AxiosResponse<any> = await axios.post(
        `${MAP_CONFIG_API_URL}/config`,
        {
          name: 'extra-wallet',
          ref_uuid: walletId,
          ref_id: walletId,
          data: {
            ...(walletLogoUrl && {
              logo_url: walletLogoUrl,
            }),
            ...(walletCoverUrl && {
              cover_url: walletCoverUrl,
            }),
          },
        },
      );

      return response.data;
    } catch (e) {
      this.logger.debug('Map config API error:', e);
      throw new HttpException(
        `${name} webmap config addition failed, ${e.toString()}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async updateWallet(
    updateWalletDto: UpdateWalletDto,
    loggedInWalletId: string,
  ): Promise<Wallet> {
    const { display_name, add_to_web_map, logo_image, cover_image, wallet_id } =
      updateWalletDto;
    const walletIdToUpdate = wallet_id;

    // checked if logged in wallet has control over wallet to be updated
    const hasControl = await this.hasControlOverByName(
      loggedInWalletId,
      walletIdToUpdate,
    );
    if (!hasControl) {
      throw new HttpException(
        'You do not have permission to update this wallet',
        HttpStatus.UNPROCESSABLE_ENTITY,
      );
    }

    // upload images if provided
    let coverImageUrl: string | undefined;
    let logoImageUrl: string | undefined;
    if (cover_image) {
      coverImageUrl = await this.s3Service.upload(
        cover_image.buffer,
        `${walletIdToUpdate}_${new Date().toISOString()}`,
        cover_image.mimetype || 'image/png',
      );
    }
    if (logo_image) {
      logoImageUrl = await this.s3Service.upload(
        logo_image.buffer,
        `${walletIdToUpdate}_${new Date().toISOString()}`,
        logo_image.mimetype || 'image/png',
      );
    }

    // update data in the repository
    const updateData: Partial<Wallet> = {
      id: walletIdToUpdate,
      name: display_name,
      logo_url: logoImageUrl,
      cover_url: coverImageUrl,
    };
    const updatedWallet = await this.walletRepository.updateWallet(updateData);

    // if add_to_web_map is true, update the wallet's configuration in the map
    if (add_to_web_map) {
      await this.addWalletToMapConfig({
        walletId: wallet_id,
        walletLogoUrl: logoImageUrl,
        walletCoverUrl: coverImageUrl,
      });
    }

    // remove sensitive information before returning
    delete updatedWallet.password;
    delete updatedWallet.salt;

    return updatedWallet;
  }

  async batchCreateWallet(
    sender_wallet: string,
    token_transfer_amount_default: number,
    wallet_id: string,
    csvJson: {
      wallet_name: string;
      token_transfer_amount_overwrite?: number;
      extra_wallet_data_logo_url?: string;
      extra_wallet_data_cover_url?: string;
    }[],
    filePath: string,
  ): Promise<{ message: string }> {
    try {
      let senderWallet;
      if (sender_wallet) {
        senderWallet = await this.getByName(sender_wallet);
        if (!senderWallet) {
          throw new HttpException(
            'Sender wallet does not exist',
            HttpStatus.NOT_FOUND,
          );
        }
      }

      const walletsToCreate: {
        amount: number;
        walletName: string;
        extra_wallet_data_logo_url?: string;
        extra_wallet_data_cover_url?: string;
      }[] = [];
      let totalAmountToTransfer = 0;

      for (const {
        wallet_name,
        token_transfer_amount_overwrite,
        extra_wallet_data_logo_url,
        extra_wallet_data_cover_url,
      } of csvJson) {
        const amount =
          token_transfer_amount_overwrite || token_transfer_amount_default;
        if (amount && !sender_wallet) {
          throw new HttpException(
            'sender_wallet is required for transfer.',
            HttpStatus.UNPROCESSABLE_ENTITY,
          );
        }
        if (amount) {
          totalAmountToTransfer += +amount;
        }
        walletsToCreate.push({
          amount,
          walletName: wallet_name,
          extra_wallet_data_logo_url,
          extra_wallet_data_cover_url,
        });
      }

      if (senderWallet) {
        const tokenCount = await this.tokenService.countTokenByWallet(
          senderWallet.id,
        );
        if (totalAmountToTransfer > tokenCount) {
          throw new HttpException(
            'Sender does not have enough tokens.',
            HttpStatus.UNPROCESSABLE_ENTITY,
          );
        }
      }

      const createdWallets = [];
      for (const {
        walletName,
        amount,
        extra_wallet_data_logo_url,
        extra_wallet_data_cover_url,
      } of walletsToCreate) {
        const newWallet = await this.createWallet(wallet_id, walletName);

        if (amount && senderWallet) {
          await this.transferService.transferBundle(
            wallet_id,
            senderWallet,
            newWallet,
            amount,
            false,
          );
        }

        if (extra_wallet_data_logo_url || extra_wallet_data_cover_url) {
          await this.addWalletToMapConfig({
            walletId: newWallet.id,
            name: newWallet.name,
            walletLogoUrl: extra_wallet_data_logo_url,
            walletCoverUrl: extra_wallet_data_cover_url,
          });
        }
        createdWallets.push(newWallet);
      }

      await fs.unlink(filePath).catch(() => {
        console.error(`Failed to delete file at path: ${filePath}`);
      });

      return {
        message: 'Batch wallet creation successful',
      };
    } catch (e) {
      // Cleanup file and rethrow error
      await fs.unlink(filePath).catch(() => {
        console.error(`Failed to delete file at path: ${filePath}`);
      });
      throw new HttpException(
        e.message || 'Failed to process batch wallet creation',
        e.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async batchTransferWallet(
    sender_wallet: string,
    token_transfer_amount_default: number,
    wallet_id: string,
    csvJson: {
      wallet_name: string;
      token_transfer_amount_overwrite?: number;
    }[],
    filePath: string,
  ): Promise<{ message: string }> {
    let senderWallet;
    try {
      // Ensure sender_wallet exists
      senderWallet = await this.getByName(sender_wallet);
      if (!senderWallet) {
        throw new HttpException(
          'Sender wallet not found.',
          HttpStatus.NOT_FOUND,
        );
      }

      const recipientWallets: { amount: number; walletDetails: any }[] = [];
      let totalAmountToTransfer = 0;

      for (const { wallet_name, token_transfer_amount_overwrite } of csvJson) {
        const amount =
          token_transfer_amount_overwrite || token_transfer_amount_default;

        // Validate amount
        if (amount <= 0) {
          throw new HttpException(
            `Invalid transfer amount for wallet: ${wallet_name}`,
            HttpStatus.UNPROCESSABLE_ENTITY,
          );
        }

        // Fetch recipient wallet details
        const walletDetails = await this.getByName(wallet_name);
        if (!walletDetails) {
          throw new HttpException(
            `Recipient wallet not found: ${wallet_name}`,
            HttpStatus.NOT_FOUND,
          );
        }

        recipientWallets.push({ amount, walletDetails });
        totalAmountToTransfer += amount;
      }

      // Validate sender wallet token balance
      const tokenCount = await this.tokenService.countTokenByWallet(
        senderWallet.id,
      );
      if (totalAmountToTransfer > tokenCount) {
        throw new HttpException(
          'Sender does not have enough tokens.',
          HttpStatus.UNPROCESSABLE_ENTITY,
        );
      }

      // Perform transfers
      for (const { walletDetails, amount } of recipientWallets) {
        await this.transferService.transferBundle(
          wallet_id,
          senderWallet,
          walletDetails,
          amount,
          false,
        );
      }

      await fs.unlink(filePath).catch(() => {
        console.error(`Failed to delete file at path: ${filePath}`);
      });

      return { message: 'Batch wallet transfer successful' };
    } catch (e) {
      // Cleanup file and rethrow error
      await fs.unlink(filePath).catch(() => {
        console.error(`Failed to delete file at path: ${filePath}`);
      });

      throw new HttpException(
        e.message || 'Failed to process batch wallet transfer',
        e.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
