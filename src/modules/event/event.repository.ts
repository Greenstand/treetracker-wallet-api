import { DataSource, Repository } from 'typeorm';
import { Event } from './entity/event.entity';
import { LogEventDto } from './dto/log-event.dto';
import { Injectable } from '@nestjs/common';

@Injectable()
export class EventRepository extends Repository<Event> {
  constructor(dataSource: DataSource) {
    super(Event, dataSource.createEntityManager());
  }

  async logEvent(dto: LogEventDto): Promise<Event> {
    const event = this.create({
      wallet_id: dto.wallet_id,
      type: dto.type,
    });

    return await this.save(event);
  }
}
