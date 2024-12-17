import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';
import { WalletRepository } from './wallet.repository';
import { TokenModule } from '../token/token.module';
import { TrustModule } from '../trust/trust.module';
import { EventModule } from '../event/event.module';
import { S3Service } from '../../common/services/s3.service';
import { TransferModule } from '../transfer/transfer.module';
import { Wallet } from './entity/wallet.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Wallet]),
    forwardRef(() => TransferModule),
    EventModule,
    TokenModule,
    TrustModule,
  ],
  controllers: [WalletController],
  providers: [WalletRepository, WalletService, S3Service],
  exports: [WalletRepository, WalletService],
})
export class WalletModule {}
