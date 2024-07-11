import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EventRepository } from './event.repository';
import { Event } from './entity/event.entity';
import { LogEventDto } from './dto/log-event.dto';

@Injectable()
export class EventService {
  constructor(
    @InjectRepository(EventRepository)
    private eventRepository: EventRepository,
  ) {}

  async logEvent(dto: LogEventDto): Promise<Event> {
    return this.eventRepository.logEvent(dto);
  }
}
