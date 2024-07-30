import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { WalletRepository } from './wallet.repository';
import { TokenRepository } from '../token/token.repository';
import { validate as uuidValidate } from 'uuid';
import {
  ENTITY_TRUST_REQUEST_TYPE,
  ENTITY_TRUST_STATE_TYPE,
} from '../trust/trust-enum';
import { TrustRepository } from '../trust/trust.repository';
import { Trust } from '../trust/entity/trust.entity';
// import { LimitOptions } from 'src/common/interfaces/limit-options.interface';

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
    private trustRepository: TrustRepository,
    private tokenRepository: TokenRepository,
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
        state: ENTITY_TRUST_STATE_TYPE.trusted,
      });
      filter.or[1].and.push({
        actor_wallet_id: childId,
        state: ENTITY_TRUST_STATE_TYPE.trusted,
      });
    }

    const result = await this.trustRepository.getByFilter(filter);

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

    const tokenCount = await this.tokenRepository.countByFilter({
      wallet_id: walletId,
    });

    const walletName = wallet.name;
    return { id: walletId, wallet: walletName, tokens_in_wallet: tokenCount };
  }

  // todo: createWallet()
  // todo: updateWallet()

  // async getAllWallets(
  //   id: string,
  //   limitOptions: LimitOptions,
  //   name: string,
  //   sort_by: string,
  //   order: 'ASC' | 'DESC',
  //   created_at_start_date?: string,
  //   created_at_end_date?: string,
  //   getTokenCount = true,
  //   getWalletCount = true,
  // ): Promise<{ wallets: any[]; count?: number }> {
  //   if (getTokenCount) {
  //     const { wallets, count } = await this.walletRepository.getAllWallets(
  //       id,
  //       limitOptions,
  //       name,
  //       sort_by,
  //       order,
  //       created_at_start_date,
  //       created_at_end_date,
  //       getWalletCount,
  //     );

  //     const walletsWithTokens = await Promise.all(
  //       wallets.map(async (wallet: Wallet) => {
  //         const tokensInWallet = await this.tokenService.countTokenByWallet(
  //           wallet.id,
  //         );
  //         return { ...wallet, tokens_in_wallet: tokensInWallet };
  //       }),
  //     );

  //     return { wallets: walletsWithTokens, count };
  //   }

  //   return this.walletRepository.getAllWallets(
  //     id,
  //     limitOptions,
  //     name,
  //     sort_by,
  //     order,
  //     created_at_start_date,
  //     created_at_end_date,
  //     getWalletCount,
  //   );
  // }

  async hasControlOver(parentId: string, childId: string): Promise<boolean> {
    if (parentId === childId) {
      this.logger.debug('The same wallet');
      return true;
    }

    const result = await this.getSubWallets(parentId, childId);
    return result.length > 0;
  }
  // todo: batchCreateWallet()
  // todo: addWalletToMapConfig()
  // todo: batchTransferWallet()
  // todo: hasControlOverByName()
}
