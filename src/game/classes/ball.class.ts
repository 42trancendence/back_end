
export class Ball
{
	/**
	 * @param x_ 공의 가로 위치 
	 * @param y_ 공의 세로 위치
	 * @param radius_ 공의 반지름
	 * @param speed_ 공의 초기 속력
	 * @param accceleration_ 공의 가속도
	 * @param dx_ 공의 가로 방향 속도
	 * @param dy_ 공의 세로 방향 속도
	 */
	private x_: number;
	private y_: number;
	private radius_: number;
	private speed_: number;
	private direction_: number;

	constructor(
		x: number = 0,
		y: number = 0,
		radius: number = 0,
		speed: number = 0,
		direction: number = 0
	) {
		this.x_ = x;
		this.y_ = y;
		this.radius_ = radius;
		this.speed_ = speed;
		this.direction_ = direction;
	}

	public move(): void {
		
	}

	public reset(): void {
		
	}

	public collisionDetect(): void {
		
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

	public getDirection(): number {
		return this.direction_;
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

	public setDirection(direction: number): void {
		this.direction_ = direction;
	}
}