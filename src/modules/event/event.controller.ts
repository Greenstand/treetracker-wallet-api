import { Controller, Post, Body } from '@nestjs/common';
import { EventService } from './event.service';
import { LogEventDto } from './dto/log-event.dto';

@Controller('event')
export class EventController {
  constructor(private readonly eventService: EventService) {}

  @Post()
  async logEvent(@Body() logEventDto: LogEventDto) {
    return this.eventService.logEvent(logEventDto);
  }
}
