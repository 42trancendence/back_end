import { Ball } from './ball.class';
import { GameStatus, GameVariable } from '../constants/gameVariable';
import { Paddle } from './paddle.class';
import { Server } from 'socket.io';

export class Game {
  private roomId_: string;
  private gameStatus_: string = GameStatus.Wait;
  private ball_: Ball = new Ball();
  private paddles_: Array<Paddle> = [
    new Paddle(0),
    new Paddle(GameVariable.canvasWidth - GameVariable.paddleWidth),
  ];
  private score_: Array<number> = [0, 0];

  constructor(private id: string) {
    this.roomId_ = id;
  }

  public sendGame(server: Server, roomId: string): void {
    server.to(roomId).emit('gaming', this);
  }

  public getRoomId(): string {
    return this.roomId_;
  }

  public setGameStatus(gameStatus: string): void {
    this.gameStatus_ = gameStatus;
  }

  public getGameStatus(): string {
    return this.gameStatus_;
  }

  public getScore(): Array<number> {
    return this.score_;
  }
}
