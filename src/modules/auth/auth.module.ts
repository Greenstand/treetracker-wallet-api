import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { WalletService } from '../wallet/wallet.service';
import { EventService } from '../event/event.service';
import { JWTService } from './jwt.service';
import { HashService } from './hash.service';
import { ApiKeyService } from './api-key.service';
import { ApiKey } from './entity/api-key.entity';
import { WalletModule } from '../wallet/wallet.module';
import { EventModule } from '../event/event.module';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([ApiKey]),
    WalletModule,
    EventModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    WalletService,
    EventService,
    JWTService,
    HashService,
    ApiKeyService,
  ],
})
export class AuthModule {}
