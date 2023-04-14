
import { Ball } from './ball.class';
import { GameStatus } from '../constants/gameVariable';
import { Player } from './player.class';
import { Server } from 'socket.io';
import { SelectQueryBuilder } from 'typeorm';

export class Game
{
    private id_: string;
    private gameStatus_: string = GameStatus.Wait;
    private players_: Array<Player> = [];
    private watchers_: Array<Player> = [];
    private ball_: Ball = new Ball();

    constructor(
        private id: string,
        private players: Array<Player>
    ) {
        this.id_ = id;
        this.players_ = players;
    }

    public sendGame(server: Server, roomId: string): void {
        server.to(roomId).emit('gaming', this);
    }

    public addUser(user: Player): void {
        this.players_.push(user);
    }

    public getPlayers(): Array<Player> {
        return this.players_;
    }

    public getWatchers(): Array<Player> {
        return this.watchers_;
    }

    public getRoomId(): string {
        return this.id_;
    }

    public setGameStatus(gameStatus: string): void {
        this.gameStatus_ = gameStatus;
    }

    public getGameStatus(): string {
        return this.gameStatus_;
    }

}