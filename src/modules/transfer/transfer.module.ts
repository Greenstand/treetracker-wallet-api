import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TransferRepository } from './transfer.repository';
import { TransferService } from './transfer.service';
import { TokenModule } from '../token/token.module';
import { TrustModule } from '../trust/trust.module';
import { WalletModule } from '../wallet/wallet.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([TransferRepository]),
    forwardRef(() => WalletModule),
    TrustModule,
    TokenModule,
  ],
  providers: [TransferService],
  exports: [TransferService],
})
export class TransferModule {}
