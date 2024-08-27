import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WalletService } from './wallet.service';
import { WalletRepository } from './wallet.repository';
import { Wallet } from './entity/wallet.entity';
import { TokenModule } from '../token/token.module';
import { TrustModule } from '../trust/trust.module';
import { EventModule } from '../event/event.module';
import { S3Service } from '../../common/services/s3.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Wallet]),
    EventModule,
    TokenModule,
    TrustModule,
  ],
  providers: [WalletService, WalletRepository, S3Service],
  exports: [WalletService, WalletRepository],
})
export class WalletModule {}
