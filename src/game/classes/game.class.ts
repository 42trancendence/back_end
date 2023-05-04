import { Ball } from './ball.class';
import { GameStatus, GameVariable } from '../constants/gameVariable';
import { Paddle } from './paddle.class';

export class Game {
  private roomId_: string;
  private title_: string;
  private gameStatus_: string = GameStatus.WAIT;
  private ball_: Ball = new Ball();
  private player1Name_: string;
  private player2Name_: string;
  private paddles_: Array<Paddle> = [
    new Paddle(0),
    new Paddle(GameVariable.canvasWidth - GameVariable.paddleWidth),
  ];
  private score_: Array<number> = [0, 0];
  private setReady_: Array<string> = [];
  private setDifficulty_: Array<string> = [];
  private watcher_: Array<any> = [];

  constructor(private roomId: string, private title: string) {
    this.roomId_ = roomId;
    this.title_ = title;
    const userIds = this.title.split('-');
    this.paddles_[0].setUserId(userIds[0]);
    this.paddles_[1].setUserId(userIds[1]);
    this.player1Name_ = userIds[0];
    this.player2Name_ = userIds[1];
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

  public getTitle(): string {
    return this.title_;
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

  public getPlayer1Name(): string {
    return this.player1Name_;
  }

  public getPlayer2Name(): string {
    return this.player2Name_;
  }

  public getStatus(): string {
    return this.gameStatus_;
  }

  public getBall(): Ball {
    return this.ball_;
  }

  public getWatcherList(): Array<string> {
    return this.watcher_;
  }

  public setGameStatus(gameStatus: string): void {
    this.gameStatus_ = gameStatus;
  }

  public setReady(userId: string): void {
    this.setReady_.push(userId);
  }

  public setDifficulty(userId: string): void {
    this.setDifficulty_.push(userId);
  }

  public addWatcher(user: string): void {
    this.watcher_.push(user);
  }

  public isReady(): boolean {
    return this.setReady_.length == 2;
  }

  public isClientReady(userId: string): boolean {
    return this.setReady_.includes(userId);
  }

  public isDifficulty(): boolean {
    return this.setDifficulty_.length == 2;
  }

  public isWatcher(userId): boolean {
    let flag = false;
    this.watcher_.map((user) => {
      if (user.id == userId) {
        flag = true;
        return;
      }
    });
    return flag;
  }

  public cancelReady(userId: string): void {
    this.setReady_ = this.setReady_.filter((id) => id != userId);
  }

  public cancelDifficulty(userId: string): void {
    this.setDifficulty_ = this.setDifficulty_.filter((id) => id != userId);
  }

  public deleteWatcher(userId: string): void {
    this.watcher_ = this.watcher_.filter((id) => id != userId);
  }

  public reset(roomId: string): void {
    this.roomId_ = roomId;
    this.score_ = [0, 0];
    this.setReady_ = [];
    this.ball_.reset();
    this.paddles_[0].reset();
    this.paddles_[1].reset();
    this.gameStatus_ = GameStatus.WAIT;
  }
}
