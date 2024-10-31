import { Controller, Get, Param } from '@nestjs/common';
import { WalletService } from './wallet.service';

@Controller('wallets')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get(':wallet_id')
  async getWalletById(@Param('wallet_id') walletId: string) {
    return await this.walletService.getById(walletId);
  }
}
