import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TokenRepository } from './token.repository';
import { TokenService } from './token.service';
import { TransactionModule } from '../transaction/transaction.module';

@Module({
  imports: [TypeOrmModule.forFeature([TokenRepository]), TransactionModule],
  providers: [TokenService],
  exports: [TokenService],
})
export class TokenModule {}
