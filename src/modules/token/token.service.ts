import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { TokenRepository } from './token.repository';

@Injectable()
export class TokenService {
  constructor(
    @InjectRepository(TokenRepository)
    private tokenRepository: TokenRepository,
  ) {}
}
