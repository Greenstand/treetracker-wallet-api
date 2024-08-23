import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { TokenRepository } from './token.repository';

@Injectable()
export class TokenService {
  constructor(
    @InjectRepository(TokenRepository)
    private tokenRepository: TokenRepository,
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
}
