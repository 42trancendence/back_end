import { Injectable } from '@nestjs/common';
import { GameRepository } from './repository/game.repository';
import { Server, Socket } from 'socket.io';
import { AuthService } from 'src/auth/auth.service';
import { Player } from './classes/player.class';
import { Game } from './classes/game.class';
import { GameManager } from './classes/gameManager.class';
import { Logger } from '@nestjs/common';
import { PlayerList } from './classes/playerList.class';
import { WsException } from '@nestjs/websockets';
import { GameStatus } from './constants/gameVariable';
import { GameStatsEntity } from './entities/gameStats.entity';

@Injectable()
export class GameService {
  constructor(
    private gameRepository: GameRepository,
    private authService: AuthService,
  ) {}
  private readonly WsLogger = new Logger('GameWsLogger');

  async createGame(server: Server, gameManager: GameManager) {
    const allSockets = await server.in('matching').fetchSockets();
    if (allSockets.length >= 2) {
      const client1 = allSockets.shift();
      const client2 = allSockets.shift();
      const player1 = client1.data.user;
      const player2 = client2.data.user;
      const newRoomId = `${player1.name}-${player2.name}`;

      client1.leave('matching');
      client1.join(newRoomId);
      client1.data.roomId = newRoomId;
      client1.emit('startGame');
      client2.leave('matching');
      client2.join(newRoomId);
      client2.data.roomId = newRoomId;
      client2.emit('startGame');

      gameManager.createGame(`${player1.name}-${player2.name}`);
      const newGame = await this.gameRepository.saveGameState(player1, player2);
      if (newGame) {
        client1.emit('getMatching', newGame);
        client2.emit('getMatching', newGame);
      }
    }
  }

  async getGameList() {
    const gameList = await this.gameRepository.getGameList();
    return gameList;
  }

  async updateGameState(game: GameStatsEntity) {
    const gameData = await this.gameRepository.updateGameState(game);
    return gameData;
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

  async deleteGameByRoomId(roomId: string) {
    await this.gameRepository.deleteGameByRoomId(roomId);
  }
}
