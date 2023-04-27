import { GameVariable } from '../constants/gameVariable';
import { Paddle } from './paddle.class';

export class Player {
    id_: string;
    name_: string;
    email_: string;
    avatarImageUrl_: string;
    roomId_: string;
    paddle_: Paddle;
    is1p: boolean;

    constructor(
        id: string,
        roomId: string,
        name: string,
        email: string,
        avatarImageUrl: string,
        is1p: boolean
    ) {
        this.id_ = id;
        this.roomId_ = roomId;
        this.name_ = name;
        this.email_ = email;
        this.avatarImageUrl_ = avatarImageUrl;
        if (is1p) {
            this.paddle_ = new Paddle(GameVariable.leftPaddleX);
        }
        else {
            this.paddle_ = new Paddle(GameVariable.rightPaddleX);
        }
    }

    public setRoomId(roomId: string): void {
        this.roomId_ = roomId;
    }

    public getRoomId(): string {
        return this.roomId_;
    }

    public getName(): string {
        return this.name_;
    }

    public getId(): string {
        return this.id_;
    }

    public getPaddle(): Paddle {
        return this.paddle_;
    }

}