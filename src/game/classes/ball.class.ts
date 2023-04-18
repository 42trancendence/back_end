import { GameVariable } from '../constants/gameVariable';
import { Paddle } from './paddle.class';

export class Ball {
  /**
   * @param x_ 공의 가로 위치
   * @param y_ 공의 세로 위치
   * @param radius_ 공의 반지름
   * @param velocityX_ 공의 가로 방향 속도
   * @param velocityY_ 공의 세로 방향 속도
   * @param speed_ 공의 초기 속력
   */
  private x_: number;
  private y_: number;
  private radius_: number;
  private velocityY_: number;
  private velocityX_: number;
  private speed_: number;

  constructor(
    x: number = GameVariable.canvasWidth / 2,
    y: number = GameVariable.canvasHeight / 2,
    radius: number = GameVariable.ballRadius,
    velocityX: number = GameVariable.ballSpeed,
    velocityY: number = GameVariable.ballSpeed,
    speed: number = GameVariable.ballSpeed,
  ) {
    this.x_ = x;
    this.y_ = y;
    this.radius_ = radius;
    this.velocityX_ = Math.random() * velocityX;
    this.velocityY_ = Math.random() * velocityY;
    this.speed_ = speed;
  }

  public reset(): void {
    this.x_ = GameVariable.canvasWidth / 2;
    this.y_ = GameVariable.canvasHeight / 2;
    this.speed_ = GameVariable.ballSpeed;
    // TODO
    // 1. 공의 방향을 랜덤으로 설정
    // 2. 공의 속도를 랜덤으로 설정
    this.velocityX_ = Math.random() * GameVariable.ballSpeed;
  }

  public move(paddle: Paddle, score: Array<number>): void {
    this.x_ += this.velocityX_;
    this.y_ += this.velocityY_;
    // 공이 위 아래 벽에 부딪히면 방향을 바꿔준다.
    if (
      this.y_ + this.radius_ > GameVariable.canvasHeight ||
      this.y_ - this.radius_ < 0
    ) {
      this.velocityY_ = -this.velocityY_;
    }

    if (this.collisionPaddleDetect(paddle)) {
      let collidePoint =
        this.y_ - (paddle.getY() + GameVariable.paddleHeight / 2);
      collidePoint = collidePoint / (GameVariable.paddleHeight / 2);

      const angle = collidePoint * (Math.PI / 4);
      const direction = this.x_ < GameVariable.canvasWidth / 2 ? 1 : -1;

      this.velocityX_ = direction * this.speed_ * Math.cos(angle);
      this.velocityY_ = this.speed_ * Math.sin(angle);

      this.speed_ += 0.1;
    }

    // Score update
    if (this.x_ - this.radius_ < 0) {
      score[0]++;
      this.reset();
    } else if (this.x_ + this.radius_ > GameVariable.canvasWidth) {
      score[1]++;
      this.reset();
    }
  }

  public collisionPaddleDetect(paddle: Paddle): boolean {
    // paddle의 충돌위치를 가져온다.
    const pTop = paddle.getY();
    const pBottom = paddle.getY() + GameVariable.paddleHeight;
    const pLeft = paddle.getX();
    const pRight = paddle.getX() + GameVariable.paddleWidth;
    // 공의 충돌위치를 가져온다.
    const bTop = this.y_ - this.radius_;
    const bBottom = this.y_ + this.radius_;
    const bLeft = this.x_ - this.radius_;
    const bRight = this.x_ + this.radius_;

    return bBottom > pTop && bTop < pBottom && bRight > pLeft && bLeft < pRight;
  }

  public getX(): number {
    return this.x_;
  }

  public getY(): number {
    return this.y_;
  }

  public getRadius(): number {
    return this.radius_;
  }

  public getSpeed(): number {
    return this.speed_;
  }

  public setX(x: number): void {
    this.x_ = x;
  }

  public setY(y: number): void {
    this.y_ = y;
  }

  public setRadius(radius: number): void {
    this.radius_ = radius;
  }

  public setSpeed(speed: number): void {
    this.speed_ = speed;
  }
}
