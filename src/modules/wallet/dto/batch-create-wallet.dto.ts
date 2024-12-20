import { IsString, IsOptional, IsNumber, ValidateIf } from 'class-validator';
import { Transform } from 'class-transformer';
import { CsvItemDto } from './csv-item.dto';

export class BatchCreateWalletDto {
  @IsString()
  @IsOptional()
  sender_wallet: string;

  @IsNumber()
  @IsOptional()
  @ValidateIf((o) => o.token_transfer_amount_default !== undefined)
  @Transform(({ value }) => {
    if (value === '') return undefined;
    const num = Number(value);
    return isNaN(num) ? value : num;
  })
  token_transfer_amount_default: number;

  @IsString()
  @IsOptional()
  wallet_id: string;

  csvJson: CsvItemDto[];

  @IsString()
  @IsOptional()
  filePath: string;
}
