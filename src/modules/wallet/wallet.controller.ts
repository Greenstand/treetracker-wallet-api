import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { WalletService } from './wallet.service';
import { TrustService } from '../trust/trust.service';
import { TrustFilterDto } from '../trust/dto/trust-filter.dto';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { UpdateWalletDto } from './dto/update-wallet.dto';
import * as multer from 'multer';

export const imageUpload = multer({
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png/;
    const isMimeTypeAllowed = allowedTypes.test(file.mimetype);
    if (!isMimeTypeAllowed) {
      return cb(<any>new Error('Only image files are supported.'), false);
    }
    cb(null, true);
  },
  limits: { fileSize: 1000000 }, // 1 MB
});

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

  @Patch(':wallet_id')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'cover_image', maxCount: 1 },
      { name: 'logo_image', maxCount: 1 },
    ]),
  )
  async updateWallet(
    @Param('wallet_id') walletId: string,
    @Body() updateWalletDto: UpdateWalletDto,
    @UploadedFiles()
    files: {
      cover_image?: Express.Multer.File[];
      logo_image?: Express.Multer.File[];
    },
    @Request() req,
  ) {
    // extract images if uploaded
    const logoImage = files.logo_image ? files.logo_image[0] : null;
    const coverImage = files.cover_image ? files.cover_image[0] : null;

    // add uploaded images to the DTO
    updateWalletDto.logo_image = logoImage;
    updateWalletDto.cover_image = coverImage;
    return await this.walletService.updateWallet(
      updateWalletDto,
      req.user.walletId,
    );
  }

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
