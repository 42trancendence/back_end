import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GameRoomsEntity } from './entities/gameRooms.entity';
import { GameSessionEntity } from './entities/gameSession.entity';
import { GameStatEntity } from './entities/gameStats.entity';
import { GameController } from './game.controller';
import { GameGateway } from './game.gateway';
import { GameService } from './game.service';
import { GameRepository } from './repository/game.repository';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([GameRoomsEntity, GameSessionEntity, GameStatEntity]),
    AuthModule,
  ],
  controllers: [GameController],
  providers: [
    GameService,
    GameRepository,
    GameGateway
  ],
  // exports: [GameService, GameRoomsEntity, GameSessionEntity, GameStatEntity, GameGateway]
})
export class GameModule {}
