import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JWTService } from './jwt.service';
import { HashService } from './hash.service';
import { ApiKeyService } from './api-key.service';
import { WalletModule } from '../wallet/wallet.module';
import { EventModule } from '../event/event.module';
import { ApiKey } from './entity/api-key.entity';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forFeature([ApiKey]),
    WalletModule,
    EventModule,
  ],
  providers: [AuthService, JWTService, HashService, ApiKeyService],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
