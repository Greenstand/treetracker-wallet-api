import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TokenRepository } from './token.repository';
import { TokenService } from './token.service';
import { TransactionModule } from '../transaction/transaction.module';
import { Token } from './entity/token.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Token]), TransactionModule],
  providers: [TokenRepository, TokenService],
  exports: [TokenRepository, TokenService],
})
export class TokenModule {}
