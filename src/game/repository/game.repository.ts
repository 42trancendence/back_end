import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { GameStatsEntity } from '../entities/gameStats.entity';
import { GameStatus } from '../constants/gameVariable';
import { UserEntity } from 'src/users/entities/user.entity';

@Injectable()
export class GameRepository extends Repository<GameStatsEntity> {
  constructor(datasource: DataSource) {
    super(GameStatsEntity, datasource.createEntityManager());
  }
  async saveGameState(player1: UserEntity, player2: UserEntity) {
    const newGameState = new GameStatsEntity();

    newGameState.roomId = player1.name + '-' + player2.name;
    newGameState.player1 = player1;
    newGameState.player2 = player2;
    newGameState.player1Score = 0;
    newGameState.player2Score = 0;
    newGameState.winnerName = '';
    newGameState.loserName = '';
    newGameState.createAt = new Date();
    newGameState.status = GameStatus.Wait;

    return await this.save(newGameState);
  }

  async updateGameState(game: GameStatsEntity) {
    return await this.save(game);
  }

  async getGameList() {
    return await this.find();
  }

  async getRoomIdByUserId(userId: string) {
    return await this.createQueryBuilder('gameStats')
      .select('gameStats.roomId')
      .leftJoin('gameStats.player1', 'player1')
      .leftJoin('gameStats.player2', 'player2')
      .where('player1.id = :userId', { userId })
      .orWhere('player2.id = :userId', { userId })
      .orderBy('gameStats.createAt', 'DESC') // 최근 날짜부터 정렬
      .getOne(); // 가장 최근 항목 하나만 반환
  }
}
