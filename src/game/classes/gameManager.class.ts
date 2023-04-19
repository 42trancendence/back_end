import { GameStatus } from '../constants/gameVariable';
import { Game } from './game.class';
import { Server } from 'socket.io';

export class GameManager {
  gameList: Map<string, Game> = new Map<string, Game>();

  sendGame(server: Server) {
    this.gameList.forEach((game) => {
      if (game.getGameStatus() !== GameStatus.Play) return;
      game.updateGame();

      // console.log('game.getRoomId()', game.getRoomId());

      server.to(game.getRoomId()).emit('updateGame', game);
    });
  }

  createGame(roomId: string) {
    const game = new Game(roomId);
    this.gameList.set(roomId, game);
  }

  removeGame(roomId: string) {
    this.gameList.delete(roomId);
  }

  getGameByRoomId(roomId: string): Game {
    return this.gameList.get(roomId);
  }

  isGameByRoomId(roomId: string) {
    return this.gameList.has(roomId);
  }

  getGameRooms() {
    return this.gameList;
  }
}
