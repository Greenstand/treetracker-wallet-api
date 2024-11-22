import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { WalletService } from './wallet.service';
import { TrustService } from '../trust/trust.service';
import { TrustFilterDto } from '../trust/dto/trust-filter.dto';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { UpdateWalletDto } from './dto/update-wallet.dto';
import * as multer from 'multer';
import { FileInterceptor } from '@nestjs/platform-express';
import * as csvtojson from 'csvtojson';
import { diskStorage } from 'multer';
import * as uuid from 'uuid';
import { BatchCreateWalletDto } from './dto/batch-create-wallet.dto';
import { BatchTransferWalletDto } from './dto/batch-transfer-wallet.dto';
import { csvFileFilter } from '../../common/utils/csvFileFilter';

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

  @Post('batch-create-wallet')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, callback) => {
          const uniqueFilename = `${file.fieldname}-${uuid.v4()}-${file.originalname}`;
          callback(null, uniqueFilename);
        },
      }),
      fileFilter: csvFileFilter,
      limits: { fileSize: 500000 }, // Set file size limit (500KB)
    }),
  )
  async batchCreateWallet(
    @Body() batchCreateWalletDto: BatchCreateWalletDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const { sender_wallet, token_transfer_amount_default, wallet_id } =
      batchCreateWalletDto;

    // Convert the uploaded CSV file to JSON
    const csvJson = await csvtojson().fromFile(file.path);
    return this.walletService.batchCreateWallet(
      sender_wallet,
      token_transfer_amount_default,
      wallet_id,
      csvJson,
      file.path,
    );
  }

  @Post('batch-transfer')
  async batchTransfer(@Body() batchTransferWalletDto: BatchTransferWalletDto) {
    const {
      sender_wallet,
      token_transfer_amount_default,
      wallet_id,
      csvJson,
      filePath,
    } = batchTransferWalletDto;

    return this.walletService.batchTransferWallet(
      sender_wallet,
      token_transfer_amount_default,
      wallet_id,
      csvJson,
      filePath,
    );
  }
}
