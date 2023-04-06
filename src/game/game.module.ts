import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GameStatEntity } from './entities/gameStat.entity';
import { GameController } from './game.controller';
import { GameGateway } from './game.gateway';
import { GameService } from './game.service';
import { GameRepository } from './repository/game.repository';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([GameStatEntity]),
    AuthModule,
  ],
  controllers: [GameController],
  providers: [
    GameService,
    GameRepository,
    GameGateway
  ],
})
export class GameModule {}
