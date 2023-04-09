
import { Ball } from './ball.class';
import { GameVariable, gameState } from './gameVariable.class';
import { User } from './user.class';
import { Server } from 'socket.io';

export class Game
{
    private id_: string;
    private gameState_: gameState = gameState.WAIT;
    private players_: Array<User> = [];
    private watchers_: Array<User> = [];
    private ball_: Ball = new Ball();
    private score_ = [0, 0];

    constructor(
        private id: string
    ) {
        this.id_ = id;
    }

    public sendGame(server: Server): void {
        this.players_.forEach((p) => {
            server.to(p.getSocketId()).emit('game', this);
        });
    }

    public addUser(user: User): void {
        this.players_.push(user);
    }

    public getId(): string {
        return this.id_;
    }

    public getPlayers(): Array<User> {
        return this.players_;
    }

    public getWatchers(): Array<User> {
        return this.watchers_;
    }

    public getRoomId(): string {
        return this.id_;
    }

    public setGameState(gameState: gameState) {
        this.gameState_ = gameState;
    }

    public getGameState(): gameState {
        return this.gameState_;
    }

    public startGame(): void {
        this.gameState_ = gameState.PLAY;
    }

}