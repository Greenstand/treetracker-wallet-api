import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class LogEventDto {
  @IsUUID()
  wallet_id: string;

  @IsString()
  type: string;

  @IsNotEmpty()
  payload: any;
}
