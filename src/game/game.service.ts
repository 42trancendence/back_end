import { Injectable } from '@nestjs/common';
import { GameRepository } from './repository/game.repository';
import { Server, Socket } from 'socket.io';
import { AuthService } from 'src/auth/auth.service';
import { GameManager } from './classes/gameManager.class';
import { Logger } from '@nestjs/common';
import { PlayerList } from './classes/playerList.class';
import { WsException } from '@nestjs/websockets';
import * as uuid from 'uuid';
import { GameStatus } from './constants/gameVariable';
import { UserRepository } from 'src/users/repository/user.repository';
import { Game } from './classes/game.class';

@Injectable()
export class GameService {
  constructor(
    private gameRepository: GameRepository,
    private userRepository: UserRepository,
    private authService: AuthService,
  ) {}
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
      // client1.emit('startGame'); // 이거 필요 없어서 삭제해도 될 듯
      client2.leave(GameStatus.MATCHING);
      client2.join(newRoomId);
      client2.data.roomId = newRoomId;
      // client2.emit('startGame');

      gameManager.createGame(newRoomId, title);
      const newGame = this.saveGameState(newRoomId, title, player1, player2);
      if (newGame) {
        client1.emit('getMatching', 'matching', newRoomId);
        client2.emit('getMatching', 'matching', newRoomId);
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

  async getPlayerBySocket(client: Socket, players: PlayerList) {
    const user = await this.authService.getUserBySocket(client);
    if (!user) {
      client.disconnect();
      throw new WsException('Unauthorized');
    }
    const player = players.getPlayerByUserId(user.id);
    if (!player) {
      client.disconnect();
      throw new WsException('User is not in game');
    }

    return player;
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
