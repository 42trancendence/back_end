import { Injectable } from '@nestjs/common';
import { GameRepository } from './repository/game.repository';
import { Server, Socket } from 'socket.io';
import { AuthService } from 'src/auth/auth.service';
import { User } from './classes/user.class';
import { Game } from './classes/game.class';
import { GameManager } from './classes/gameManager.class';
import { Logger } from '@nestjs/common';
import { Players } from './classes/players.class';

@Injectable()
export class GameService {
  constructor(
      private gameRepository: GameRepository,
      private authService: AuthService,
  ) {}
  private readonly WsLogger = new Logger('GameWsLogger');

  createGame(server: Server, matchingPlayers: Array<User>, gameManager: GameManager, players: Players) {
    const roomId = matchingPlayers[0].getName() + matchingPlayers[1].getName();
    const newGame = new Game(
      roomId,
    );
    // 각자 게임방에 입장 알림
    server
      .to(matchingPlayers[0].getId())
      .to(matchingPlayers[1].getId())
      .emit('matching', roomId);
    gameManager.addGame(newGame);
    // 각 유저의 방 정보 업데이트
    server.to('lobby').emit('getRoomList', gameManager.getGameList());
  }
}
