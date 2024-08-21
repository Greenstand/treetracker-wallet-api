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

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: `.env.${process.env.NODE_ENV}`,
      isGlobal: true,
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: process.env.DATABASE_URL,
      schema: process.env.DATABASE_SCHEMA || 'wallet',
      entities: [ApiKey, Wallet, Event],
      synchronize: true, // set to false in production
    }),
    TypeOrmModule.forFeature([ApiKey, Wallet]), // ensure the entities are added here for SeedService
    AuthModule,
    WalletModule,
    EventModule,
  ],
  controllers: [AppController],
  providers: [AppService, SeedService],
})
export class AppModule {}
