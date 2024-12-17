import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TrustRepository } from './trust.repository';
import { TrustService } from './trust.service';
import { Trust } from './entity/trust.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Trust])],
  providers: [TrustRepository, TrustService],
  exports: [TrustRepository, TrustService],
})
export class TrustModule {}
