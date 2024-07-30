import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TrustRepository } from './trust.repository';
import { Trust } from './entity/trust.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Trust])],
  providers: [TrustRepository],
  exports: [TrustRepository],
})
export class TrustModule {}
