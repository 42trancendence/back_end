import { Injectable } from '@nestjs/common';
import { DataSource, Repository } from 'typeorm';
import { GameStatsEntity } from '../entities/gameStats.entity';
import { GameStatus } from '../constants/gameVariable';
import { UserEntity } from 'src/users/entities/user.entity';
import { Game } from '../classes/game.class';

@Injectable()
export class GameRepository extends Repository<GameStatsEntity> {
  constructor(datasource: DataSource) {
    super(GameStatsEntity, datasource.createEntityManager());
  }
  async saveGameState(
    roomId: string,
    title: string,
    player1: UserEntity,
    player2: UserEntity,
  ) {
    const newGameState = new GameStatsEntity();

    newGameState.roomId = roomId;
    newGameState.title = title;
    newGameState.player1 = player1;
    newGameState.player2 = player2;
    newGameState.player1Score = 0;
    newGameState.player2Score = 0;
    newGameState.winnerName = '';
    newGameState.loserName = '';
    newGameState.createAt = new Date();
    newGameState.status = GameStatus.WAIT;

    return await this.save(newGameState);
  }

  async saveGameStats(game: Game) {
    const score = game.getScore();

    let winnerName = '';
    let loserName = '';
    if (score[0] > score[1]) {
      winnerName = game.getPlayer1Name();
      loserName = game.getPlayer2Name();
    } else {
      winnerName = game.getPlayer2Name();
      loserName = game.getPlayer1Name();
    }

    return await this.update(game.getRoomId(), {
      player1Score: score[0],
      player2Score: score[1],
      status: game.getGameStatus(),
      winnerName: winnerName,
      loserName: loserName,
    });
  }

  async updateGameStatus(roomId: string, status: string) {
    return await this.update(roomId, { status });
  }

  async getRoomIdByUserId(userId: string) {
    return await this.createQueryBuilder('gameStats')
      .select('gameStats.roomId')
      .leftJoin('gameStats.player1', 'player1')
      .leftJoin('gameStats.player2', 'player2')
      .where('player1.id = :userId', { userId })
      .andWhere("gameStats.status != 'end'")
      .orWhere('player2.id = :userId', { userId })
      .andWhere("gameStats.status != 'end'")
      .orderBy('gameStats.createAt', 'DESC') // 최근 날짜부터 정렬
      .getOne(); // 가장 최근 항목 하나만 반환
  }

  async getGameStateById(roomId: string): Promise<GameStatsEntity> {
    return await this.findOne({ where: { roomId: roomId } });
  }

  async getRoomIdByTitle(title: string) {
    const gameStats = await this.findOne({
      where: { title: title },
    });
    return gameStats.roomId;
  }

  async deleteGameByRoomId(roomId: string) {
    return await this.delete({ roomId });
  }

  async getGamePlayersInfo(roomId: string) {
    return await this.findOne({
      where: { roomId: roomId },
      relations: ['player1', 'player2'],
    });
  }
}
