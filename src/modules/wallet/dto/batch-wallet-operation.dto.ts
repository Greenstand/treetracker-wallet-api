import {
  IsString,
  IsOptional,
  IsNumber,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import {
  BaseWalletCsvItemDto,
  BatchCreateWalletCsvItemDto,
  BatchTransferWalletCsvItemDto,
} from './csv-item.dto';

// Base class for batch operations
export class BaseBatchWalletOperationDto {
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

  @ValidateNested({ each: true })
  @Type(() => BaseWalletCsvItemDto)
  csvJson: BaseWalletCsvItemDto[];

  @IsString()
  @IsOptional()
  filePath: string;
}

// DTO for batch create operation
export class BatchCreateWalletDto extends BaseBatchWalletOperationDto {
  @ValidateNested({ each: true })
  @Type(() => BatchCreateWalletCsvItemDto)
  csvJson: BatchCreateWalletCsvItemDto[];
}

// DTO for batch transfer operation
export class BatchTransferWalletDto extends BaseBatchWalletOperationDto {
  @ValidateNested({ each: true })
  @Type(() => BatchTransferWalletCsvItemDto)
  csvJson: BatchTransferWalletCsvItemDto[];
}
