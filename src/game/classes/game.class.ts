import { Ball } from './ball.class';
import { GameStatus, GameVariable } from '../constants/gameVariable';
import { Paddle } from './paddle.class';

export class Game {
  private roomId_: string;
  private gameStatus_: string = GameStatus.Wait;
  private ball_: Ball = new Ball();
  private paddles_: Array<Paddle> = [
    new Paddle(0),
    new Paddle(GameVariable.canvasWidth - GameVariable.paddleWidth),
  ];
  private score_: Array<number> = [0, 0];
  private setReady_: Array<string> = [];

  constructor(private id: string) {
    this.roomId_ = id;
    const userIds = this.roomId_.split('-');
    this.paddles_[0].setUserId(userIds[0]);
    this.paddles_[1].setUserId(userIds[1]);
  }

  public updateGame(): void {
    // 화면 절반을 기준으로 왼쪽은 0번 paddle, 오른쪽은 1번 paddle
    const paddle =
      this.ball_.getX() < GameVariable.canvasWidth / 2
        ? this.paddles_[0]
        : this.paddles_[1];
    this.ball_.move(paddle, this.score_);
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

  public getPaddleByUserId(userId: string): Paddle {
    return this.paddles_.find((paddle) => paddle.getUserId() == userId);
  }

  public setReady(userId: string): void {
    this.setReady_.push(userId);
  }

  public isReady(): boolean {
    return this.setReady_.length == 2;
  }

  public cancelReady(userId: string): void {
    this.setReady_ = this.setReady_.filter((id) => id != userId);
  }

  public isClientReady(userId: string): boolean {
    return this.setReady_.includes(userId);
  }
}
