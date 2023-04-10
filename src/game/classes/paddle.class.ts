import { GameVariable } from "../constants/gameVariable";

export class Paddle {
  private x_: number;
  private y_: number;
  private speed_: number;

  constructor(x: number) {
    this.x_ = x;
    this.y_ = GameVariable.cavasHeight / 2 - GameVariable.paddleHeight / 2;
    this.speed_ = 0;
  }

  public movePaddle(): void {
    if (this.speed_ <= 0) {
      return ;
    }
    this.y_ += this.speed_;
    if (this.y_ < 0) {
      this.speed_ = 0;
      this.y_ = GameVariable.paddleHeight - 5;
    }
    else if (this.y_ + GameVariable.paddleHeight > GameVariable.cavasHeight - GameVariable.boundedPaddleHeight) {
      this.speed_ = 0;
      this.y_ = GameVariable.cavasHeight - GameVariable.paddleHeight - GameVariable.boundedPaddleHeight + 5;
    }
  }

  public keyUP(key: string): void {
    if (key === 'down') {
      this.speed_ = 0;
      this.speed_ -= GameVariable.paddleSpeed;
    }
    else {
      this.speed_ = 0;
    }
  }

  public keyDOWN(key: string): void {
    if (key === 'down') {
      this.speed_ = 0;
      this.speed_ += GameVariable.paddleSpeed;
    }
    else {
      this.speed_ = 0;
    }
  }
}