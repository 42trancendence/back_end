import { Injectable } from '@nestjs/common';
import { GameRepository } from './repository/game.repository';
import { Server } from 'socket.io';
import { GameManager } from './classes/gameManager.class';
import { Logger } from '@nestjs/common';
import * as uuid from 'uuid';
import { GameStatus } from './constants/gameVariable';
import { Game } from './classes/game.class';

@Injectable()
export class GameService {
  constructor(private gameRepository: GameRepository) {}
  private readonly WsLogger = new Logger('GameWsLogger');

  async createGame(server: Server, gameManager: GameManager) {
    const allSockets = await server.in(GameStatus.MATCHING).fetchSockets();
    if (allSockets.length >= 2) {
      const client1 = allSockets.shift();
      const client2 = allSockets.shift();
      const player1 = client1.data.user;
      const player2 = client2.data.user;
      const title = `${player1.name}-${player2.name}`;
      const newRoomId = uuid.v4();

      client1.leave(GameStatus.MATCHING);
      client1.join(newRoomId);
      client1.data.roomId = newRoomId;
      client2.leave(GameStatus.MATCHING);
      client2.join(newRoomId);
      client2.data.roomId = newRoomId;

      gameManager.createGame(newRoomId, title);
      const newGame = this.saveGameState(newRoomId, title, player1, player2);
      if (newGame) {
        client1.emit('getMatching', 'matching', 'matching', newRoomId);
        client2.emit('getMatching', 'matching', 'matching', newRoomId);
      }
    }
  }

  async saveGameState(newRoomId, title, player1, player2) {
    return await this.gameRepository.saveGameState(
      newRoomId,
      title,
      player1,
      player2,
    );
  }

  async getRoomIdByUserId(userId: string) {
    const roomId = await this.gameRepository.getRoomIdByUserId(userId);
    if (roomId) {
      return roomId.roomId;
    }
    return null;
  }

  async updateGameStats(game: Game) {
    return await this.gameRepository.saveGameStats(game);
  }

  async updateGameStatus(roomId: string, status: GameStatus) {
    return await this.gameRepository.updateGameStatus(roomId, status);
  }

  async deleteGameByRoomId(roomId: string) {
    await this.gameRepository.deleteGameByRoomId(roomId);
  }

  async getGamePlayersInfo(roomId: string) {
    return await this.gameRepository.getGamePlayersInfo(roomId);
  }
}
