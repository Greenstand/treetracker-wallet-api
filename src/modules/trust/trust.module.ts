import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TrustRepository } from './trust.repository';
import { TrustService } from './trust.service';

@Module({
  imports: [TypeOrmModule.forFeature([TrustRepository])],
  providers: [TrustService],
  exports: [TrustService],
})
export class TrustModule {}
