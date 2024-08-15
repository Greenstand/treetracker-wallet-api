import { IsEnum, IsUUID } from 'class-validator';
import { EVENT_TYPES } from '../event-enum';

export class LogEventDto {
  @IsUUID()
  wallet_id: string;

  @IsEnum(EVENT_TYPES)
  type: EVENT_TYPES;
}
