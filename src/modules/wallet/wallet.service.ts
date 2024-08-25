import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
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
    limitOptions: any,
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
      limitOptions,
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
}
