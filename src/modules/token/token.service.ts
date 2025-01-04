import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { TokenRepository } from './token.repository';
import { TransactionRepository } from '../transaction/transaction.repository';
import { Token } from './entity/token.entity';
import { Transfer } from '../transfer/entity/transfer.entity';

@Injectable()
export class TokenService {
  private readonly logger = new Logger(TokenService.name);

  constructor(
    @InjectRepository(TokenRepository)
    private tokenRepository: TokenRepository,
    private transactionRepository: TransactionRepository,
  ) {}

  /*
   * Count how many tokens a wallet has
   */
  async countTokenByWallet(wallet_id) {
    const result = await this.tokenRepository.countByFilter({
      wallet_id,
    });
    return result;
  }

  async countByFilter(filter: any): Promise<number> {
    return this.tokenRepository.countByFilter(filter);
  }

  /*
   * Count how many not claimed tokens a wallet has
   */
  async countNotClaimedTokenByWallet(walletId: string): Promise<number> {
    return await this.tokenRepository.countNotClaimedTokenByWallet(walletId);
  }

  /*
   * Get n tokens from a wallet
   */
  async getTokensByBundle(
    wallet_id: string,
    bundleSize: number,
    // TODO: getByFilter should be able to handle claim boolean
    // claimBoolean: boolean,
  ): Promise<Token[]> {
    const result = await this.tokenRepository.getByFilter(
      {
        wallet_id,
        transfer_pending: false,
      },
      {
        limit: bundleSize,
        // claim: claimBoolean,
      },
    );
    return result;
  }

  /*
   * Replaces token.completeTransfer as a bulk operation
   */
  async completeTransfer(
    tokens: Token[],
    transfer: Transfer,
    claimBoolean: boolean,
  ): Promise<void> {
    this.logger.debug('Token complete transfer batch');

    // update the tokens in bulk
    await this.tokenRepository.updateByIds(
      {
        transfer_pending: false,
        transfer_pending_id: null,
        wallet_id: transfer.destinationWalletId,
        claim: claimBoolean,
      },
      tokens.map((token) => token.id),
    );

    // Create transactions in bulk
    await this.transactionRepository.batchCreate(
      tokens.map((token) => ({
        token_id: token.id,
        transfer_id: transfer.id,
        source_wallet_id: transfer.sourceWalletId,
        destination_wallet_id: transfer.destinationWalletId,
        claim: claimBoolean,
      })),
    );
  }
}
