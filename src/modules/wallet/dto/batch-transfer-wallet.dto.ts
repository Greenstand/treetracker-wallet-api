import { IsString, IsNumber, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class CsvJsonDto {
  @IsString()
  wallet_name: string;

  @IsNumber()
  token_transfer_amount_overwrite?: number;
}

export class BatchTransferWalletDto {
  @IsString()
  sender_wallet: string;

  @IsNumber()
  token_transfer_amount_default: number;

  @IsString()
  wallet_id: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CsvJsonDto)
  csvJson: CsvJsonDto[];

  @IsString()
  filePath: string;
}
