import { GameVariable } from "../constants/gameVariable";
import { Paddle } from "./paddle.class";
import { Player } from "./player.class";

export class Ball
{
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
		dx: number = GameVariable.ballSpeed,
		dy: number = GameVariable.ballSpeed,
		speed: number = GameVariable.ballSpeed
	) {
		this.x_ = x;
		this.y_ = y;
		this.radius_ = radius;
		this.velocityX_ = dx;
		this.velocityY_ = dy;
		this.speed_ = speed;
	}

	public reset(): void {
		this.x_ = GameVariable.canvasWidth / 2;
		this.y_ = GameVariable.canvasHeight / 2;
		this.speed_ = GameVariable.ballSpeed;
		// TODO
		// 1. 공의 방향을 랜덤으로 설정
		// 2. 공의 속도를 랜덤으로 설정
		this.velocityX_ = -this.velocityX_;
	}

	public move(player: Player): void {
		this.x_ += this.velocityX_;
		this.y_ += this.velocityY_;
		if (this.y_ + this.radius_ > GameVariable.canvasHeight ||
				this.y_ - this.radius_ < 0) {
			this.velocityY_ = -this.velocityY_;
		}

		const playerPaddle = player.getPaddle();
		// if (this.collisionDetect(playerPaddle)) {
		// 	let collidePoint = this.y_ - ()
		// }
	}


	public collisionDetect(paddle: Paddle): boolean {
		const pTop = paddle.getY();
		const pBottom = paddle.getY() + GameVariable.paddleHeight;
		const pLeft = paddle.getX();
		const pRight = paddle.getX() + GameVariable.paddleWidth;
		const bTop = this.y_ - this.radius_;
		const bBottom = this.y_ + this.radius_;
		const bLeft = this.x_ - this.radius_;
		const bRight = this.x_ + this.radius_;

		return (bBottom > pTop && bTop < pBottom && bRight > pLeft && bLeft < pRight) 
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