import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { WalletService } from '../wallet/wallet.service';
import { EventService } from '../event/event.service';
import { JWTService } from './jwt.service';
import { HashService } from './hash.service';
import { ApiKeyService } from './api-key.service';
import { AUTH_EVENTS } from '../utils/event-enum';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private walletService: WalletService,
    private eventService: EventService,
    private jwtService: JWTService,
    private hashService: HashService,
    private apiKeyService: ApiKeyService,
  ) {}

  async signIn(
    wallet: string,
    password: string,
    apiKey: string,
  ): Promise<string> {
    this.logger.debug(`Attempting to sign in with wallet: ${wallet}`);

    await this.apiKeyService.check(apiKey);
    this.logger.debug(`API key validated for wallet: ${wallet}`);

    const walletObject = await this.walletService.getByName(wallet);
    if (!walletObject) {
      this.logger.warn(`Wallet not found: ${wallet}`);
      throw new UnauthorizedException('Invalid Credentials');
    }

    this.logger.debug(`Wallet found: ${wallet}, computing hash`);
    const hash = this.hashService.sha512(password, walletObject.salt);

    if (hash === walletObject.password) {
      this.logger.debug(`Hash matched for wallet: ${wallet}, generating token`);

      const token = this.jwtService.sign({
        id: walletObject.id,
        name: walletObject.name,
      });

      if (!token) {
        this.logger.warn(`Token not present`);
      } else {
        this.logger.debug(`Token: ${token}`);
      }

      // todo: event not logged into db yet. investigating
      this.logger.debug(`Logging signIn event...`);
      await this.eventService.logEvent({
        wallet_id: walletObject.id,
        type: AUTH_EVENTS.login,
        payload: {},
      });

      this.logger.debug(`Login successful for wallet: ${wallet}`);
      return token;
    }

    this.logger.warn(`Invalid credentials for wallet: ${wallet}`);
    throw new UnauthorizedException('Invalid Credentials');
  }
}
