import { IsNumber, IsOptional, IsString } from 'class-validator';

export class BatchCreateWalletDto {
  @IsString()
  @IsOptional()
  sender_wallet: string;

  @IsNumber()
  @IsOptional()
  token_transfer_amount_default: number;

  @IsString()
  @IsOptional()
  wallet_id: string;
}
