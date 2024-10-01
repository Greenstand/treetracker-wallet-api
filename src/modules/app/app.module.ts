import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from '../auth/auth.module';
import { ApiKey } from '../auth/entity/api-key.entity';
import { WalletModule } from '../wallet/wallet.module';
import { EventModule } from '../event/event.module';
import { Wallet } from '../wallet/entity/wallet.entity';
import { Event } from '../event/entity/event.entity';
import { SeedService } from '../seed/seed.service';
import { Trust } from '../trust/entity/trust.entity';
import { TrustModule } from '../trust/trust.module';
import { TokenModule } from '../token/token.module';
import { Token } from '../token/entity/token.entity';
import { TransferModule } from '../transfer/transfer.module';
import { TransactionModule } from '../transaction/transaction.module';
import { Transfer } from '../transfer/entity/transfer.entity';
import { Transaction } from '../transaction/entity/transaction.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: `.env.${process.env.NODE_ENV}`,
      isGlobal: true,
    }),
    TypeOrmModule.forRootAsync({
      useFactory: async () => {
        return {
          type: 'postgres',
          url: process.env.DATABASE_URL,
          schema: process.env.DATABASE_SCHEMA || undefined,
          entities: [
            ApiKey,
            Wallet,
            Event,
            Token,
            Trust,
            Transfer,
            Transaction,
          ],
          synchronize: false,
        };
      },
    }),
    TypeOrmModule.forFeature([ApiKey, Wallet]), // ensure the entities are added here for SeedService
    AuthModule,
    WalletModule,
    EventModule,
    TokenModule,
    TrustModule,
    TransferModule,
    TransactionModule,
  ],
  controllers: [AppController],
  providers: [AppService, SeedService],
})
export class AppModule {}
