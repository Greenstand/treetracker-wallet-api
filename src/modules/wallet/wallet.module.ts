import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WalletService } from './wallet.service';
import { WalletRepository } from './wallet.repository';
import { TokenModule } from '../token/token.module';
import { TrustModule } from '../trust/trust.module';
import { EventModule } from '../event/event.module';
import { S3Service } from '../../common/services/s3.service';
import { TransferModule } from '../transfer/transfer.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([WalletRepository]),
    forwardRef(() => TransferModule),
    EventModule,
    TokenModule,
    TrustModule,
  ],
  providers: [WalletService, S3Service],
  exports: [WalletService],
})
export class WalletModule {}
