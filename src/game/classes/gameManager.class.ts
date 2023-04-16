import { Game } from './game.class';
import { Server } from 'socket.io';

export class GameManager {
  gameMap: Map<string, Game> = new Map<string, Game>();

  sendGame(server: Server) {
    this.gameMap.forEach((game, roomId) => {
      console.log('sendGame!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!', roomId);
      server.to(roomId).emit('gaming', game);
    });
  }

  createGame(roomId: string) {
    const game = new Game(roomId);
    this.gameMap.set(roomId, game);
  }

  removeGame(roomId: string) {
    this.gameMap.delete(roomId);
  }

  getGameByRoomId(roomId: string) {
    return this.gameMap.get(roomId);
  }

  isGameByRoomId(roomId: string) {
    return this.gameMap.has(roomId);
  }

  getGameRooms() {
    return this.gameMap;
  }
}
