import {
  BadRequestException,
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
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { WalletService } from './wallet.service';
import { TrustService } from '../trust/trust.service';
import { TrustFilterDto } from '../trust/dto/trust-filter.dto';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { UpdateWalletDto } from './dto/update-wallet.dto';
import * as multer from 'multer';
import * as csvtojson from 'csvtojson';
import { BatchCreateWalletDto } from './dto/batch-create-wallet.dto';
import { BatchTransferWalletDto } from './dto/batch-transfer-wallet.dto';
import { CsvFileUploadInterceptor } from '../../common/interceptors/csvFileUpload.interceptor';
import { plainToClass } from 'class-transformer';
import { CsvItemDto } from './dto/csv-item.dto';
import { validate } from 'class-validator';

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
  @UseInterceptors(CsvFileUploadInterceptor())
  @UsePipes(new ValidationPipe({ transform: true }))
  async batchCreateWallet(
    @Body() batchCreateWalletDto: BatchCreateWalletDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('CSV file is required');
    }

    try {
      const csvJson = await csvtojson().fromFile(file.path);

      // Validate CSV data
      const csvItems = csvJson.map((item) => plainToClass(CsvItemDto, item));
      for (const item of csvItems) {
        const errors = await validate(item);
        if (errors.length > 0) {
          throw new BadRequestException(errors);
        }
      }

      // Check for unique wallet names
      const walletNames = csvItems.map((item) => item.wallet_name);
      if (walletNames.length !== new Set(walletNames).size) {
        throw new BadRequestException(
          'Each wallet_name in csvJson must be unique.',
        );
      }

      batchCreateWalletDto.csvJson = csvItems;
      batchCreateWalletDto.filePath = file.path;

      const result = await this.walletService.batchCreateWallet(
        batchCreateWalletDto.sender_wallet,
        batchCreateWalletDto.token_transfer_amount_default,
        batchCreateWalletDto.wallet_id,
        batchCreateWalletDto.csvJson,
        batchCreateWalletDto.filePath,
      );
      return result;
    } catch (error) {
      throw error;
    }
  }

  @Post('batch-transfer')
  @UseInterceptors(CsvFileUploadInterceptor())
  @UsePipes(new ValidationPipe({ transform: true }))
  async batchTransfer(
    @Body() batchTransferWalletDto: BatchTransferWalletDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const { path } = file;
    const csvJson = await csvtojson().fromFile(path);
    batchTransferWalletDto.csvJson = csvJson;
    batchTransferWalletDto.filePath = path;

    const {
      sender_wallet,
      token_transfer_amount_default,
      wallet_id,
      csvJson: validatedCsvJson,
      filePath,
    } = batchTransferWalletDto;

    return await this.walletService.batchTransferWallet(
      sender_wallet,
      token_transfer_amount_default,
      wallet_id,
      validatedCsvJson,
      filePath,
    );
  }
}
