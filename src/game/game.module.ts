import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GameStatsEntity } from './entities/gameStats.entity';
import { GameController } from './game.controller';
import { GameGateway } from './game.gateway';
import { GameService } from './game.service';
import { GameRepository } from './repository/game.repository';
import { AuthModule } from 'src/auth/auth.module';
import { UsersModule } from 'src/users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([GameStatsEntity]),
    AuthModule,
    UsersModule,
  ],
  controllers: [GameController],
  providers: [GameService, GameRepository, GameGateway],
})
export class GameModule {}
