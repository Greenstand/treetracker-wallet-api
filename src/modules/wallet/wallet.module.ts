import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WalletService } from './wallet.service';
import { WalletRepository } from './wallet.repository';
import { Wallet } from './entity/wallet.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Wallet])],
  providers: [WalletService, WalletRepository],
  exports: [WalletService, WalletRepository],
})
export class WalletModule {}
