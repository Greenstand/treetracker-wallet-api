import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Event } from './entity/event.entity';
import { EventService } from './event.service';
import { EventRepository } from './event.repository';

@Module({
  imports: [TypeOrmModule.forFeature([Event])],
  providers: [EventService, EventRepository],
  exports: [EventService, EventRepository],
})
export class EventModule {}
