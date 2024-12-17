import {
  IsString,
  IsArray,
  IsOptional,
  ValidateNested,
  IsNotEmpty,
  IsNumber,
  Validate,
} from 'class-validator';
import { Type } from 'class-transformer';
import { UniqueWalletNameConstraint, CsvItemDto } from './csv-item.dto';

export class BatchTransferWalletDto {
  @IsString()
  @IsNotEmpty()
  sender_wallet: string;

  @IsNumber()
  @IsNotEmpty()
  token_transfer_amount_default: number;

  @IsString()
  @IsOptional()
  wallet_id: string;

  @IsArray()
  @Validate(UniqueWalletNameConstraint)
  @ValidateNested({ each: true })
  @Type(() => CsvItemDto)
  csvJson: CsvItemDto[];

  @IsString()
  @IsOptional()
  filePath: string;
}
