import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { WalletService } from './wallet.service';
import { TrustService } from '../trust/trust.service';
import { TrustFilterDto } from '../trust/dto/trust-filter.dto';

@Controller('wallets')
export class WalletController {
  constructor(
    private readonly walletService: WalletService,
    private readonly trustService: TrustService,
  ) {}

  @Get(':wallet_id')
  async getById(@Param('wallet_id') walletId: string) {
    return await this.walletService.getById(walletId);
  }

  // todo: patch by wallet id

  @Get(':wallet_id/trust_relationships')
  async getTrustRelationships(
    @Param('wallet_id') walletId: string,
    @Query() query: TrustFilterDto,
  ) {
    const filterDto: TrustFilterDto = { walletId, ...query };
    return await this.trustService.getTrustRelationships(filterDto);
  }

  // todo: post batch-create-wallet

  @Post('batch-transfer')
  async batchTransfer(
    @Body('sender_wallet') senderWallet: string,
    @Body('token_transfer_amount_default') tokenTransferAmountDefault: number,
    @Body('wallet_id') walletId: string,
    @Body('csvJson')
    csvJson: {
      wallet_name: string;
      token_transfer_amount_overwrite?: number;
    }[],
    @Body('filePath') filePath: string,
  ) {
    try {
      return await this.walletService.batchTransferWallet(
        senderWallet,
        tokenTransferAmountDefault,
        walletId,
        csvJson,
        filePath,
      );
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to process batch transfer',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
