import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GameRoomsEntity } from './entities/gameRooms.entity';
import { GameSessionEntity } from './entities/gameSession.entity';
import { GameStatEntity } from './entities/gameStats.entity';
import { GameController } from './game.controller';
import { GameGateway } from './game.gateway';
import { GameService } from './game.service';
import { GameRepository } from './repository/game.repository';

@Module({
  imports: [TypeOrmModule.forFeature([GameRoomsEntity, GameSessionEntity, GameStatEntity])],
  controllers: [GameController],
  providers: [GameService, GameRepository, GameRoomsEntity, GameSessionEntity, GameStatEntity, GameGateway],
  exports: [GameService, GameRoomsEntity, GameSessionEntity, GameStatEntity, GameGateway]
})
export class GameModule {}
