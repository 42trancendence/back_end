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

  async createGame(server: Server) {
    const allSockets = await server.in('matching').fetchSockets();
    if (allSockets.length >= 2) {
      const client1 = allSockets.shift();
      const client2 = allSockets.shift();
      client1.leave('matching');
      client1.join('gameRoomId');
      client1.emit('startGame');
      client2.leave('matching');
      client2.join('gameRoomId');
      client2.emit('startGame');

      const player1 = client1.data.user;
      const player2 = client2.data.user;
      const newGame = await this.gameRepository.saveGameState(player1, player2);
      if (newGame) {
        client1.emit('matchingSuccess', newGame);
        client2.emit('matchingSuccess', newGame);
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
}
