import { IsOptional, IsString, IsEnum, IsNumber, IsIn } from 'class-validator';
import { ENTITY_TRUST_STATE_TYPE } from '../trust-enum';

export class TrustFilterDto {
  @IsOptional()
  @IsString()
  walletId?: string;

  @IsOptional()
  @IsString()
  managedWallets?: { id: string }[];

  @IsOptional()
  @IsEnum(ENTITY_TRUST_STATE_TYPE)
  state?: ENTITY_TRUST_STATE_TYPE;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  request_type?: string;

  @IsOptional()
  @IsNumber()
  offset?: number;

  @IsOptional()
  @IsNumber()
  limit?: number;

  @IsOptional()
  @IsString()
  @IsIn(['id', 'created_at', 'updated_at'])
  sort_by?: string;

  @IsOptional()
  @IsIn(['ASC', 'DESC'])
  order?: 'ASC' | 'DESC';

  @IsOptional()
  @IsString()
  search?: string;
}
