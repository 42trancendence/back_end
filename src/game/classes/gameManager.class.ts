import { Game } from './game.class';

export class GameManager {
    gameArray: Array<Game> = [];

    constructor() {}

    public addGame(game: Game): void {
        this.gameArray.push(game);
    }

    public removeGame(roomId: string): void {
        this.gameArray = this.gameArray.filter((g) => g.getRoomId() !== roomId);
    }

    public getGameList(): Array<Game> {
        return this.gameArray;
    }

    public getGameListLength(): number {
        return this.gameArray.length;
    }

    public getGameByRoomId(roomId: string): Game {
        return this.gameArray.find((g) => g.getRoomId() === roomId);
    }

    public isGameByRoomId(roomId: string): boolean {
        return this.gameArray.some((g) => g.getRoomId() === roomId);
    }

    public isGameInGameList(game: Game): boolean {
        return this.gameArray.includes(game);
    }

    public isGameFull(): boolean {
        return this.gameArray.length >= 10;
    }

    public getMatchGame(): Game {
        if (this.gameArray.length < 1) {
            return null;
        }
        const game = this.gameArray.shift();
        return game;
    }
}