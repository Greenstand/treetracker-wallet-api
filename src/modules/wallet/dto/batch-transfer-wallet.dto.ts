import {
  IsString,
  IsArray,
  IsOptional,
  ValidateNested,
  IsNotEmpty,
  IsNumber,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

import { Type } from 'class-transformer';

// Custom validator to check for unique `wallet_name` values in the csvJson array
@ValidatorConstraint({ async: false })
class UniqueWalletNameConstraint implements ValidatorConstraintInterface {
  validate(csvJson: CsvJsonDto[]): boolean {
    const walletNames = csvJson.map((item) => item.wallet_name);
    return walletNames.length === new Set(walletNames).size;
  }

  defaultMessage(): string {
    return 'Each wallet_name in csvJson must be unique.';
  }
}

class CsvJsonDto {
  @IsString()
  @IsNotEmpty()
  wallet_name: string;

  @IsOptional()
  @IsNumber()
  token_transfer_amount_overwrite?: number;

  @IsOptional()
  @IsString()
  extra_wallet_data_about?: string;
}

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
  @Type(() => CsvJsonDto)
  csvJson: CsvJsonDto[];

  @IsString()
  @IsOptional()
  filePath: string;
}
