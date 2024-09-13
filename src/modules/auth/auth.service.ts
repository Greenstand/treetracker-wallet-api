import { Injectable, UnauthorizedException } from '@nestjs/common';
import { WalletService } from '../wallet/wallet.service';
import { EventService } from '../event/event.service';
import { JWTService } from './jwt.service';
import { HashService } from './hash.service';
import { ApiKeyService } from './api-key.service';
import { EVENT_TYPES } from '../event/event-enum';

@Injectable()
export class AuthService {
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
    await this.apiKeyService.check(apiKey);

    const walletObject = await this.walletService.getByName(wallet);
    if (!walletObject) {
      throw new UnauthorizedException('Invalid Credentials');
    }
    const hashedPassword = this.hashService.sha512(password, walletObject.salt);

    if (hashedPassword === walletObject.password) {
      const token = this.jwtService.sign({
        id: walletObject.id,
        name: walletObject.name,
      });

      await this.eventService.logEvent({
        wallet_id: walletObject.id,
        type: EVENT_TYPES.login,
      });

      return token;
    }
    throw new UnauthorizedException('Invalid Credentials');
  }
}
