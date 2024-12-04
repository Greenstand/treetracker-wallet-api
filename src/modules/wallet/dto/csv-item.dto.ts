import {
  IsString,
  IsOptional,
  IsNotEmpty,
  IsNumber,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

// Custom validator to check for unique `wallet_name` values in the csvJson array
@ValidatorConstraint({ async: false })
export class UniqueWalletNameConstraint
  implements ValidatorConstraintInterface
{
  validate(csvJson: CsvItemDto[]): boolean {
    const walletNames = csvJson.map((item) => item.wallet_name);
    return walletNames.length === new Set(walletNames).size;
  }

  defaultMessage(): string {
    return 'Each wallet_name in csvJson must be unique.';
  }
}

export class CsvItemDto {
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
