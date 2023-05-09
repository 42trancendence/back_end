import { UsersService } from 'src/users/users.service';
import { GameStatus, GameVariable } from '../constants/gameVariable';
import { GameService } from '../game.service';
import { Game } from './game.class';
import { Server } from 'socket.io';

export class GameManager {
  gameList: Map<string, Game> = new Map<string, Game>();

  sendGame(
    server: Server,
    gameService: GameService,
    usersService: UsersService,
  ) {
    this.gameList.forEach((game) => {
      const score = game.getScore();
      if (
        game.getGameStatus() === GameStatus.PLAY &&
        (score[0] >= GameVariable.maxScore || score[1] >= GameVariable.maxScore)
      ) {
        // 게임 종료 뒤 결과 저장하고 방 폭파
        game.setGameStatus(GameStatus.END);
        // 이기면 +10점 지면 -10점
        usersService.updateUserRating(
          game.getPlayer1Name(),
          game.getPlayer2Name(),
          score,
        );
        gameService.updateGameStats(game);
        this.deleteGameByRoomId(game.getRoomId());
        // server.to(game.getRoomId()).emit('postLeaveGame', 'delete');
        server.to(game.getRoomId()).emit(
          'setStartGame',
          JSON.stringify({
            player1: game.getPlayer1Name(),
            player2: game.getPlayer2Name(),
            score: score,
          }),
        );
      }
      if (game.getGameStatus() !== GameStatus.PLAY) return;
      game.updateGame();
      server.to(game.getRoomId()).emit('updateGame', game);
    });
  }

  createGame(roomId: string, title: string): void {
    const game = new Game(roomId, title);
    this.gameList.set(roomId, game);
  }

  deleteGameByTitle(title: string): void {
    this.gameList.delete(title);
  }

  deleteGameByRoomId(roomId: string): void {
    this.gameList.delete(roomId);
  }

  getGameByRoomId(roomId: string): Game {
    return this.gameList.get(roomId);
  }

  isGameByRoomId(roomId: string): boolean {
    return this.gameList.has(roomId);
  }

  getGameRooms() {
    return this.gameList;
  }
}
