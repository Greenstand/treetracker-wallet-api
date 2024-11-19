import { IsNumber, IsString } from 'class-validator';

export class BatchCreateWalletDto {
  @IsString()
  sender_wallet: string;

  @IsNumber()
  token_transfer_amount_default: number;

  @IsString()
  wallet_id: string;
}
