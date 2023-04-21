import { GameVariable } from '../constants/gameVariable';

export class Paddle {
  private userId: string;
  private x_: number;
  private y_: number;
  private width_: number = GameVariable.paddleWidth;
  private height_: number = GameVariable.paddleHeight;
  private speed_: number;

  constructor(x: number) {
    this.x_ = x;
    this.y_ = GameVariable.canvasHeight / 2 - GameVariable.paddleHeight / 2;
    this.speed_ = 0;
  }

  public movePaddle(): void {
    this.y_ += this.speed_;
    if (this.y_ < 0) {
      this.speed_ = 0;
      this.y_ = GameVariable.paddleHeight - 5;
    } else if (
      this.y_ + GameVariable.paddleHeight >
      GameVariable.canvasHeight - GameVariable.boundedPaddleHeight
    ) {
      this.speed_ = 0;
      this.y_ =
        GameVariable.canvasHeight -
        GameVariable.paddleHeight -
        GameVariable.boundedPaddleHeight +
        5;
    }
  }

  public reset(): void {
    this.y_ = GameVariable.canvasHeight / 2 - GameVariable.paddleHeight / 2;
  }

  public setKeyUp(): void {
    this.y_ -= GameVariable.paddleSpeed;
    if (this.y_ <= 0) {
      this.y_ = 0;
    }
  }

  public setKeyDown(): void {
    this.y_ += GameVariable.paddleSpeed;
    if (this.y_ >= GameVariable.canvasHeight - this.height_) {
      this.y_ = GameVariable.canvasHeight - this.height_;
    }
  }

  public getX(): number {
    return this.x_;
  }

  public getY(): number {
    return this.y_;
  }

  public setUserId(userId: string): void {
    this.userId = userId;
  }

  public getUserId(): string {
    return this.userId;
  }
}
