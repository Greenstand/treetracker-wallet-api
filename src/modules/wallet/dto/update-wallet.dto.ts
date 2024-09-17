import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateWalletDto {
  @IsString()
  wallet_id: string;

  @IsOptional()
  @IsString()
  display_name?: string;

  @IsOptional()
  @IsString()
  about?: string;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  add_to_web_map?: boolean;

  @IsOptional()
  cover_image?: {
    buffer: Buffer;
    mimetype: string;
  };

  @IsOptional()
  logo_image?: {
    buffer: Buffer;
    mimetype: string;
  };
}
