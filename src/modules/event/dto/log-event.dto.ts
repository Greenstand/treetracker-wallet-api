import { IsNotEmpty, IsString, IsNumber } from 'class-validator';

export class LogEventDto {
  @IsNumber()
  wallet_id: number;

  @IsString()
  type: string;

  @IsNotEmpty()
  payload: any;
}
