import {
  IsString,
  IsOptional,
  IsNotEmpty,
  IsNumber,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';

export class BaseWalletCsvItemDto {
  @IsString()
  @IsNotEmpty()
  wallet_name: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Transform(({ value }) => (value === '' ? undefined : Number(value)))
  token_transfer_amount_overwrite?: number;
}

// DTO for batch create wallet
export class BatchCreateWalletCsvItemDto extends BaseWalletCsvItemDto {
  @IsOptional()
  @IsString()
  extra_wallet_data_logo_url?: string;

  @IsOptional()
  @IsString()
  extra_wallet_data_cover_url?: string;
}

// DTO for batch transfer wallet (no additional properties needed)
export class BatchTransferWalletCsvItemDto extends BaseWalletCsvItemDto {}

// Custom validator for unique wallet names
@ValidatorConstraint({ async: false })
export class UniqueWalletNameConstraint
  implements ValidatorConstraintInterface
{
  validate(csvJson: BaseWalletCsvItemDto[]): boolean {
    if (!csvJson || !Array.isArray(csvJson)) {
      return false;
    }
    const walletNames = csvJson.map((item) => item.wallet_name);
    return walletNames.length === new Set(walletNames).size;
  }

  defaultMessage(): string {
    return 'Each wallet_name in csvJson must be unique.';
  }
}
