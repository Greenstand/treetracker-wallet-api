import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TrustRepository } from './trust.repository';
import { Trust } from './entity/trust.entity';
import { TrustService } from './trust.service';

@Module({
  imports: [TypeOrmModule.forFeature([Trust])],
  providers: [TrustService, TrustRepository],
  exports: [TrustService, TrustRepository],
})
export class TrustModule {}
