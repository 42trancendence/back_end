import { Game } from './game.class';
import { Server } from 'socket.io';

export class GameManager {
  gameList: Array<Game> = new Array<Game>();

  sendGame(server: Server) {
    this.gameList.forEach((game) => {
      // if (game.getGameStatus() !== 'playing') return;
      game.updateGame();

      console.log('game.getRoomId()', game.getRoomId());

      server.to(game.getRoomId()).emit('updateGame', this.gameList);
    });
  }

  createGame(roomId: string) {
    const game = new Game(roomId);
    this.gameList.push(game);
  }

  removeGame(roomId: string) {
    this.gameList = this.gameList.filter((game) => game.getRoomId() !== roomId);
  }

  getGameByRoomId(roomId: string) {
    return this.gameList.find((game) => game.getRoomId() === roomId);
  }

  isGameByRoomId(roomId: string) {
    return this.gameList.some((game) => game.getRoomId() === roomId);
  }

  getGameRooms() {
    return this.gameList;
  }
}
